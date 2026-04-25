// src/hooks/useHelmetConnection.js
// Manages the WebSocket lifecycle with the ESP32 helmet (for config / status).
// Once connected it also hands the helmet IP to HelmetUDP so that
// high-frequency map data (GPS, steps) is sent over UDP instead of WebSocket.

import { useState, useEffect, useRef, useCallback } from 'react'
import HelmetUDP from '../utils/HelmetUDP'

// ─── Connection states ────────────────────────────────────────────────────────
export const HELMET_STATE = {
  DISCONNECTED: 'disconnected',
  SCANNING:     'scanning',
  CONNECTING:   'connecting',
  CONNECTED:    'connected',
  ERROR:        'error',
}

// ─── Default config ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  port:              80,      // ESP32 WebSocket port (config channel)
  path:              '/ws',   // WebSocket endpoint
  udpPort:           4210,    // UDP port on ESP32 (map data channel)
  reconnectAttempts: 3,
  reconnectDelay:    2000,
  pingInterval:      5000,
  connectionTimeout: 6000,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useHelmetConnection(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [connectionState, setConnectionState] = useState(HELMET_STATE.DISCONNECTED)
  const [helmetData, setHelmetData]           = useState(null)
  const [error, setError]                     = useState(null)
  const [signal, setSignal]                   = useState(0)
  const [log, setLog]                         = useState([])
  const [helmetIp, setHelmetIp]               = useState('10.206.142.140')

  const wsRef             = useRef(null)
  const reconnectCount    = useRef(0)
  const pingTimerRef      = useRef(null)
  const reconnectTimerRef = useRef(null)
  const connectTimeoutRef = useRef(null)
  const mountedRef        = useRef(true)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = 'info') => {
    if (!mountedRef.current) return
    setLog(prev => {
      const next = [...prev, { msg, type, ts: Date.now() }]
      return next.slice(-20)
    })
  }, [])

  const safeSetState = useCallback((s) => {
    if (mountedRef.current) setConnectionState(s)
  }, [])

  const rssiToBars = (rssi) => {
    if (rssi >= -50) return 4
    if (rssi >= -65) return 3
    if (rssi >= -75) return 2
    if (rssi >= -85) return 1
    return 0
  }

  const clearTimers = useCallback(() => {
    clearInterval(pingTimerRef.current)
    clearTimeout(reconnectTimerRef.current)
    clearTimeout(connectTimeoutRef.current)
  }, [])

  const startPing = useCallback(() => {
    clearInterval(pingTimerRef.current)
    pingTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ cmd: 'ping' }))
      }
    }, cfg.pingInterval)
  }, [cfg.pingInterval])

  // ── Parse incoming ESP32 message ───────────────────────────────────────────
  const handleMessage = useCallback((raw) => {
    try {
      const data = JSON.parse(raw)
      if (data.type === 'pong') return
      if (data.rssi !== undefined) setSignal(rssiToBars(data.rssi))
      setHelmetData(data)
    } catch {
      addLog(`← ${raw}`, 'data')
    }
  }, [addLog])

  // ── Reconnect logic ────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleConnectionFailure = useCallback((ip) => {
    if (reconnectCount.current < cfg.reconnectAttempts) {
      reconnectCount.current += 1
      safeSetState(HELMET_STATE.SCANNING)
      addLog(
        `Retry ${reconnectCount.current}/${cfg.reconnectAttempts} in ${cfg.reconnectDelay / 1000}s…`,
        'info'
      )
      reconnectTimerRef.current = setTimeout(() => connect(ip), cfg.reconnectDelay)
    } else {
      safeSetState(HELMET_STATE.ERROR)
      setError(`Could not reach helmet at ${ip}`)
      addLog('Max retries reached. Check helmet WiFi.', 'error')
      reconnectCount.current = 0
    }
  }, [cfg.reconnectAttempts, cfg.reconnectDelay])

  // ── Core connect ──────────────────────────────────────────────────────────
  const connect = useCallback((ip) => {
    const targetIp = ip || helmetIp
    setHelmetIp(targetIp)

    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    clearTimers()

    setError(null)
    setLog([])
    safeSetState(HELMET_STATE.SCANNING)
    addLog(`Scanning for helmet at ${targetIp}…`, 'info')

    connectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && connectionState !== HELMET_STATE.CONNECTED) {
        addLog('Connection timed out', 'error')
        handleConnectionFailure(targetIp)
      }
    }, cfg.connectionTimeout)

    const url = `ws://${targetIp}:${cfg.port}${cfg.path}`
    addLog(`Connecting to ${url}`, 'info')
    safeSetState(HELMET_STATE.CONNECTING)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        clearTimeout(connectTimeoutRef.current)
        if (!mountedRef.current) return

        reconnectCount.current = 0
        safeSetState(HELMET_STATE.CONNECTED)
        addLog('Helmet connected ✓', 'success')
        addLog('Data stream active', 'success')

        ws.send(JSON.stringify({ cmd: 'hello', client: 'SmartHelmetApp' }))
        startPing()

        // ── Hand the helmet IP to HelmetUDP so map data flows via UDP ────
        // UDP carries high-frequency GPS + step packets (dark map theme).
        addLog(`UDP map stream → ${targetIp}:${cfg.udpPort}`, 'info')
        HelmetUDP.setTarget(targetIp, cfg.udpPort)

        // Tell helmet to switch display to dark-bg / white-roads mode
        HelmetUDP.send({ type: 'helmetViewActive', theme: 'dark' })
      }

      ws.onmessage = (e) => handleMessage(e.data)

      ws.onerror = (e) => {
        addLog(`WebSocket error: ${e.message || 'unknown'}`, 'error')
      }

      ws.onclose = (e) => {
        clearTimers()
        if (!mountedRef.current) return

        setSignal(0)

        if (e.wasClean === false) {
          addLog('Connection lost', 'error')
          handleConnectionFailure(targetIp)
        }
      }

    } catch (err) {
      clearTimeout(connectTimeoutRef.current)
      addLog(`Failed: ${err.message}`, 'error')
      handleConnectionFailure(targetIp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helmetIp, cfg, clearTimers, safeSetState, addLog, startPing, handleMessage, handleConnectionFailure])

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearTimers()
    reconnectCount.current = 0

    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop UDP map stream
    HelmetUDP.send({ type: 'helmetViewActive', theme: 'normal' })
    HelmetUDP.destroy()

    setSignal(0)
    setHelmetData(null)
    safeSetState(HELMET_STATE.DISCONNECTED)
    addLog('Disconnected', 'info')
  }, [clearTimers, safeSetState, addLog])

  // ── Send command to helmet (WebSocket config channel) ─────────────────────
  const sendCommand = useCallback((cmd, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ cmd, ...payload }))
      return true
    }
    return false
  }, [])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimers()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
      // Do NOT destroy HelmetUDP here — NavigationSession background task
      // may still need to send GPS packets to the helmet.
    }
  }, [clearTimers])

  return {
    // State
    connectionState,
    helmetData,
    error,
    signal,
    log,
    helmetIp,
    setHelmetIp,
    // Actions
    connect,
    disconnect,
    sendCommand,
    // Derived
    isConnected: connectionState === HELMET_STATE.CONNECTED,
    isScanning:  connectionState === HELMET_STATE.SCANNING ||
                 connectionState === HELMET_STATE.CONNECTING,
  }
}
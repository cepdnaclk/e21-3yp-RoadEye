// src/hooks/useHelmetConnection.js
// Manages the full WiFi → UDP connection lifecycle for the ESP32 helmet.
//
// Works with the binary PCLink protocol (HelmetUDP.js).
// Receives live sensor / IMU / wear data from the helmet and exposes it
// via helmetData so HelmetConnectButton can render it.
//
// States:
//   DISCONNECTED → connect(ip) → CONNECTING → CONNECTED
//   CONNECTED    → disconnect()             → DISCONNECTED
//   CONNECTING   → timeout / error          → ERROR → connect() → CONNECTING

import { useState, useEffect, useRef, useCallback } from 'react'
import HelmetUDP from '../utils/HelmetUDP'

// ── State machine constants ────────────────────────────────────────────────────
export const HELMET_STATE = {
  DISCONNECTED: 'DISCONNECTED',
  SCANNING:     'SCANNING',
  CONNECTING:   'CONNECTING',
  CONNECTED:    'CONNECTED',
  ERROR:        'ERROR',
}

const DEFAULT_IP   = '192.168.1.42'   // edit to your ESP32's usual IP
const CONNECT_TIMEOUT_MS = 6000        // give up if no PONG arrives in 6 s
const PING_INTERVAL_MS   = 3000        // keepalive sent by HelmetUDP itself
const MAX_LOG_LINES      = 60

// ── Helper ────────────────────────────────────────────────────────────────────
function makeLogEntry(msg, type = 'info') {
  return { msg, type, ts: Date.now() }
}

// Signal strength: map pong round-trip latency → 0-4 bars
function latencyToSignal(ms) {
  if (ms < 30)  return 4
  if (ms < 80)  return 3
  if (ms < 150) return 2
  if (ms < 300) return 1
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
export function useHelmetConnection() {
  const [connectionState, setConnectionState] = useState(HELMET_STATE.DISCONNECTED)
  const [helmetData,      setHelmetData]      = useState(null)
  const [error,           setError]           = useState(null)
  const [signal,          setSignal]          = useState(0)
  const [log,             setLog]             = useState([])
  const [helmetIp,        setHelmetIp]        = useState(DEFAULT_IP)

  const connectTimerRef = useRef(null)
  const pingTimerRef    = useRef(null)
  const pingTs          = useRef(null)   // timestamp of last outbound ping
  const isMounted       = useRef(true)

  // ── Derived booleans ───────────────────────────────────────────────────────
  const isConnected = connectionState === HELMET_STATE.CONNECTED
  const isScanning  = connectionState === HELMET_STATE.SCANNING ||
                      connectionState === HELMET_STATE.CONNECTING

  // ── Log helper ─────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = 'info') => {
    if (!isMounted.current) return
    setLog(prev => {
      const next = [...prev, makeLogEntry(msg, type)]
      return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next
    })
  }, [])

  // ── State helper ───────────────────────────────────────────────────────────
  const setState = useCallback((s) => {
    if (isMounted.current) setConnectionState(s)
  }, [])

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback((ip) => {
    const targetIp = ip || helmetIp
    addLog(`Connecting to ${targetIp}:4210…`, 'info')
    setState(HELMET_STATE.CONNECTING)
    setError(null)

    // Register callbacks BEFORE opening the socket so no data is missed
    HelmetUDP.onPong = () => {
      if (!isMounted.current) return

      // Measure round-trip
      const rtt = pingTs.current ? Date.now() - pingTs.current : 999
      setSignal(latencyToSignal(rtt))

      if (connectionState !== HELMET_STATE.CONNECTED) {
        // First pong → we're connected
        clearTimeout(connectTimerRef.current)
        setState(HELMET_STATE.CONNECTED)
        addLog(`Connected to ${targetIp}  RTT ${rtt} ms`, 'success')
      }
    }

    HelmetUDP.onSensor = (data) => {
      if (!isMounted.current) return
      setHelmetData(prev => ({
        ...prev,
        // Map PCLink sensor fields to what HelmetConnectButton's DataPills expect:
        speed:        prev?.speed ?? 0,    // speed comes from GPS telemetry
        accel:        parseFloat(data.forwardAccel?.toFixed(2)) ?? 0,
        batteryLevel: null,                // ESP32 doesn't send battery in this protocol
        // Raw fields for advanced consumers:
        distLeft:     data.distLeft,
        distRight:    data.distRight,
        distRear:     data.distRear,
        roll:         data.roll,
        temperature:  data.temperature,
        humidity:     data.humidity,
        vibration:    data.vibration,
        isRiding:     data.isRiding,
      }))
      addLog(
        `Sensor  dist L/R/R: ${data.distLeft?.toFixed(1)}/${data.distRight?.toFixed(1)}/${data.distRear?.toFixed(1)} m  accel: ${data.forwardAccel?.toFixed(2)} g`,
        'data'
      )
    }

    HelmetUDP.onImu = (data) => {
      if (!isMounted.current) return
      setHelmetData(prev => ({
        ...prev,
        imu: {
          accelX: data.accelX,
          accelY: data.accelY,
          accelZ: data.accelZ,
          gyroX:  data.gyroX,
          gyroY:  data.gyroY,
          gyroZ:  data.gyroZ,
        },
      }))
      // Only log occasionally to avoid flooding
      if (Math.random() < 0.05) {
        addLog(
          `IMU  a:(${data.accelX?.toFixed(2)}, ${data.accelY?.toFixed(2)}, ${data.accelZ?.toFixed(2)})  g:(${data.gyroX?.toFixed(1)}, ${data.gyroY?.toFixed(1)}, ${data.gyroZ?.toFixed(1)})`,
          'data'
        )
      }
    }

    HelmetUDP.onWear = (data) => {
      if (!isMounted.current) return
      setHelmetData(prev => ({ ...prev, wearState: data.state }))
      addLog(`Wear state → ${data.state}`, 'info')
    }

    // Open UDP socket pointed at the helmet
    HelmetUDP.setTarget(targetIp, 4210)

    // Send initial ping — reply triggers the CONNECTED state above
    pingTs.current = Date.now()
    HelmetUDP.sendPing()

    // Timeout: if no PONG arrives within CONNECT_TIMEOUT_MS, give up
    connectTimerRef.current = setTimeout(() => {
      if (!isMounted.current) return
      if (connectionState !== HELMET_STATE.CONNECTED) {
        setState(HELMET_STATE.ERROR)
        setError(`No response from ${targetIp} — check IP and WiFi`)
        addLog(`Timeout — no PONG from ${targetIp}`, 'error')
        HelmetUDP.destroy()
      }
    }, CONNECT_TIMEOUT_MS)

    // Update latency / signal every PING_INTERVAL_MS while connected
    pingTimerRef.current = setInterval(() => {
      if (connectionState === HELMET_STATE.CONNECTED) {
        pingTs.current = Date.now()
        // HelmetUDP already sends its own pings; this just timestamps them
      }
    }, PING_INTERVAL_MS)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helmetIp, addLog, setState])

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearTimeout(connectTimerRef.current)
    clearInterval(pingTimerRef.current)

    HelmetUDP.onSensor = null
    HelmetUDP.onImu    = null
    HelmetUDP.onWear   = null
    HelmetUDP.onPong   = null
    HelmetUDP.destroy()

    setState(HELMET_STATE.DISCONNECTED)
    setHelmetData(null)
    setSignal(0)
    addLog('Disconnected', 'info')
  }, [addLog, setState])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      clearTimeout(connectTimerRef.current)
      clearInterval(pingTimerRef.current)
    }
  }, [])

  return {
    connectionState,
    helmetData,
    error,
    signal,
    log,
    helmetIp,
    setHelmetIp,
    connect,
    disconnect,
    isConnected,
    isScanning,
  }
}
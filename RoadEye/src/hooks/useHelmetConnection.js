import { useState, useEffect, useRef, useCallback } from 'react'
import HelmetUDP from '../utils/HelmetUDP'

export const HELMET_STATE = {
  DISCONNECTED: 'disconnected',
  SCANNING: 'scanning',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
}

// FIX: define config outside the component so it's never recreated,
// eliminating cfg object reference changes as a re-render trigger.
const CFG = {
  port:               4210,
  reconnectAttempts:  3,
  reconnectDelay:     2000,
  connectionTimeout:  6000,
  pingInterval:       3000,
}

export function useHelmetConnection() {
  const [connectionState, setConnectionState] = useState(HELMET_STATE.DISCONNECTED)
  const [helmetData, setHelmetData]           = useState(null)
  const [error, setError]                     = useState(null)
  const [signal, setSignal]                   = useState(0)
  const [log, setLog]                         = useState([])
  const [helmetIp, setHelmetIp]               = useState('')
  const mountedRef         = useRef(true)
  const reconnectCount     = useRef(0)
  const connectTimeoutRef  = useRef(null)
  const reconnectTimerRef  = useRef(null)
  const pingTimerRef       = useRef(null)
  const lastPongRef        = useRef(0)
  const sensorRef          = useRef({})
  const imuRef             = useRef({})
  const connectionStateRef = useRef(HELMET_STATE.DISCONNECTED)
  const helmetIpRef        = useRef('')

  // Keep refs in sync — never put these in dep arrays
  useEffect(() => { connectionStateRef.current = connectionState }, [connectionState])
  useEffect(() => { helmetIpRef.current = helmetIp }, [helmetIp])

  // ── Stable primitives (empty dep arrays — these never change) ─────────────

  const addLog = useCallback((msg, type = 'info') => {
    if (!mountedRef.current) return
    setLog(prev => [...prev, { msg, type, ts: Date.now() }].slice(-30))
  }, [])

  const clearTimers = useCallback(() => {
    clearTimeout(connectTimeoutRef.current)
    clearTimeout(reconnectTimerRef.current)
    clearInterval(pingTimerRef.current)
  }, [])

  const publishData = useCallback((patch) => {
    setHelmetData(prev => ({ ...(prev || {}), ...patch, timestamp: Date.now() }))
  }, [])

  const markConnected = useCallback(() => {
    clearTimeout(connectTimeoutRef.current)
    reconnectCount.current  = 0
    lastPongRef.current     = Date.now()
    setError(null)
    setSignal(4)
    setConnectionState(HELMET_STATE.CONNECTED)
  }, [])

  // handleFailure and connect reference each other — use refs to break cycle
  const handleFailureRef = useRef(null)
  const connectRef       = useRef(null)

  const disconnect = useCallback(() => {
    clearTimers()
    reconnectCount.current = 0
    lastPongRef.current    = 0
    HelmetUDP.destroy()
    setSignal(0)
    setHelmetData(null)
    setConnectionState(HELMET_STATE.DISCONNECTED)
    addLog('Disconnected', 'info')
  }, [addLog, clearTimers])

  // FIX: startPing has NO state or callback deps — reads everything via refs.
  // This means it is created ONCE and never causes connect() to be recreated.
  const startPing = useCallback((ip) => {
    clearInterval(pingTimerRef.current)
    HelmetUDP.send({ type: 'ping' })

    pingTimerRef.current = setInterval(() => {
      HelmetUDP.send({ type: 'ping' })

      if (
        connectionStateRef.current === HELMET_STATE.CONNECTED &&
        lastPongRef.current &&
        Date.now() - lastPongRef.current > CFG.connectionTimeout * 2
      ) {
        handleFailureRef.current?.(ip)
      }
    }, CFG.pingInterval)
  }, []) // ← truly empty — all values read via refs or module-level CFG

  // FIX: connect is now stable — all volatile values read via refs.
  const connect = useCallback((ip) => {
    const targetIp = (ip || helmetIpRef.current || '').trim()
    if (!targetIp) return

    clearTimers()
    HelmetUDP.destroy()
    setHelmetIp(targetIp)
    setHelmetData(null)
    setError(null)
    setLog([])
    setSignal(0)
    setConnectionState(HELMET_STATE.CONNECTING)
    addLog(`Opening UDP link to ${targetIp}:${CFG.port}`, 'info')

    HelmetUDP.onPong = () => {
      addLog('PONG received. Helmet connected.', 'success')
      markConnected()
    }

    HelmetUDP.onSensor = (sensor) => {
      sensorRef.current = sensor
      publishData({
        ...imuRef.current,
        ...sensorRef.current,
      
        // speed:          sensor.forwardAccel ? Math.abs(sensor.forwardAccel * 10).toFixed(1) : 0,
        speed: sensor.speed || 0,
        accel:          sensor.forwardAccel,
        stability:      Math.max(0, Math.min(100, Math.round(100 - Math.abs(sensor.roll || 0)))),
        brakingCount:   sensor.forwardAccel < -0.6 ? 1 : 0,
        accelCount:     sensor.forwardAccel > 0.6  ? 1 : 0,
        sharpTurnCount: Math.abs(sensor.roll || 0) > 35 ? 1 : 0,
        batteryLevel:   100,
      })
      if (connectionStateRef.current !== HELMET_STATE.CONNECTED) markConnected()
    }

    HelmetUDP.onImu = (imu) => {
      imuRef.current = imu
      publishData({ ...sensorRef.current, ...imuRef.current })
      if (connectionStateRef.current !== HELMET_STATE.CONNECTED) markConnected()
    }

    HelmetUDP.onWear = (wearState) => {
      publishData({ wearState })
      if (connectionStateRef.current !== HELMET_STATE.CONNECTED) markConnected()
    }

    HelmetUDP.setTarget(targetIp, CFG.port)
    startPing(targetIp)

    connectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && lastPongRef.current === 0) {
        addLog('Connection timeout: no UDP reply from helmet', 'error')
        handleFailureRef.current?.(targetIp)
      }
    }, CFG.connectionTimeout)
  }, [addLog, clearTimers, markConnected, publishData, startPing])
  // helmetIp removed from deps — read via helmetIpRef instead

  // Keep connectRef current so handleFailure can call latest connect
  useEffect(() => { connectRef.current = connect }, [connect])

  // handleFailure lives in a ref — never in any dep array
  useEffect(() => {
    handleFailureRef.current = (ip) => {
      clearTimers()
      setSignal(0)

      if (reconnectCount.current < CFG.reconnectAttempts) {
        reconnectCount.current += 1
        setConnectionState(HELMET_STATE.SCANNING)
        addLog(`Retry ${reconnectCount.current}/${CFG.reconnectAttempts} in ${CFG.reconnectDelay / 1000}s`, 'info')
        reconnectTimerRef.current = setTimeout(() => connectRef.current?.(ip), CFG.reconnectDelay)
        return
      }

      reconnectCount.current = 0
      HelmetUDP.destroy()
      setConnectionState(HELMET_STATE.ERROR)
      setError(`Could not reach helmet at ${ip}:${CFG.port}. Check same WiFi and ESP32 IP.`)
      addLog('Max retries reached. Check helmet WiFi and IP.', 'error')
    }
  }, [addLog, clearTimers])
  // connect removed from deps — called via connectRef instead

  const sendCommand = useCallback((cmd, payload = {}) => {
    if (connectionStateRef.current !== HELMET_STATE.CONNECTED) return false
    HelmetUDP.send({ type: cmd, ...payload })
    return true
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [disconnect])

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
    sendCommand,
    isConnected: connectionState === HELMET_STATE.CONNECTED,
    isScanning:  connectionState === HELMET_STATE.SCANNING ||
                 connectionState === HELMET_STATE.CONNECTING,
  }
}
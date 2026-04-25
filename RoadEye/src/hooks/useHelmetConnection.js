import { useState, useEffect, useRef, useCallback } from 'react'
import HelmetUDP from '../utils/HelmetUDP'

export const HELMET_STATE = {
  DISCONNECTED: 'disconnected',
  SCANNING: 'scanning',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
}

const DEFAULT_CONFIG = {
  port: 4210,
  reconnectAttempts: 3,
  reconnectDelay: 2000,
  connectionTimeout: 6000,
  pingInterval: 3000,
}

export function useHelmetConnection(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [connectionState, setConnectionState] = useState(HELMET_STATE.DISCONNECTED)
  const [helmetData, setHelmetData] = useState(null)
  const [error, setError] = useState(null)
  const [signal, setSignal] = useState(0)
  const [log, setLog] = useState([])
  const [helmetIp, setHelmetIp] = useState('192.168.8.184')

  const mountedRef       = useRef(true)
  const reconnectCount   = useRef(0)
  const connectTimeoutRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const pingTimerRef     = useRef(null)
  const lastPongRef      = useRef(0)
  const sensorRef        = useRef({})
  const imuRef           = useRef({})

  // FIX: keep a ref that always mirrors connectionState so callbacks and
  // timers can read the current value without capturing a stale closure.
  const connectionStateRef = useRef(connectionState)
  useEffect(() => {
    connectionStateRef.current = connectionState
  }, [connectionState])

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
    reconnectCount.current = 0
    lastPongRef.current = Date.now()
    setError(null)
    setSignal(4)
    setConnectionState(HELMET_STATE.CONNECTED)
  }, [])

  // FIX: handleFailure is defined with useRef so it doesn't need to be in
  // connect()'s dep array. This breaks the circular dep chain:
  //   connect → handleFailure → connect (retry) → ...
  // Using a ref means the latest version is always called without needing
  // it in any dependency array.
  const handleFailureRef = useRef(null)

  const disconnect = useCallback(() => {
    clearTimers()
    reconnectCount.current = 0
    lastPongRef.current = 0
    HelmetUDP.destroy()
    setSignal(0)
    setHelmetData(null)
    setConnectionState(HELMET_STATE.DISCONNECTED)
    addLog('Disconnected', 'info')
  }, [addLog, clearTimers])

  // FIX: startPing no longer depends on connectionState directly.
  // Instead it reads connectionStateRef.current inside the interval callback
  // so it always sees the latest value without being recreated on every
  // state change (which was resetting the interval repeatedly).
  const startPing = useCallback((ip) => {
    clearInterval(pingTimerRef.current)
    HelmetUDP.send({ type: 'ping' })

    pingTimerRef.current = setInterval(() => {
      HelmetUDP.send({ type: 'ping' })

      // Read current state via ref — avoids stale closure
      if (
        connectionStateRef.current === HELMET_STATE.CONNECTED &&
        lastPongRef.current &&
        Date.now() - lastPongRef.current > cfg.connectionTimeout * 2
      ) {
        addLog('Helmet timeout: no PONG received', 'error')
        handleFailureRef.current?.(ip)
      }
    }, cfg.pingInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, cfg.connectionTimeout, cfg.pingInterval])
  // NOTE: connectionState intentionally removed from deps — we use the ref.

  // FIX: connect is defined with useCallback but startPing is now stable
  // (no longer depends on connectionState), so this dep array is stable too.
  const connect = useCallback((ip) => {
    const targetIp = (ip || helmetIp || '').trim()
    if (!targetIp) return

    clearTimers()
    HelmetUDP.destroy()
    setHelmetIp(targetIp)
    setHelmetData(null)
    setError(null)
    setLog([])
    setSignal(0)
    setConnectionState(HELMET_STATE.CONNECTING)
    addLog(`Opening UDP link to ${targetIp}:${cfg.port}`, 'info')

    HelmetUDP.onPong = () => {
      addLog('PONG received. Helmet connected.', 'success')
      markConnected()
    }

    HelmetUDP.onSensor = (sensor) => {
      sensorRef.current = sensor
      publishData({
        ...sensorRef.current,
        ...imuRef.current,
        speed: sensor.forwardAccel
          ? Math.abs(sensor.forwardAccel * 10).toFixed(1)
          : 0,
        accel:          sensor.forwardAccel,
        stability:      Math.max(0, Math.min(100, Math.round(100 - Math.abs(sensor.roll || 0)))),
        brakingCount:   sensor.forwardAccel < -0.6 ? 1 : 0,
        accelCount:     sensor.forwardAccel > 0.6  ? 1 : 0,
        sharpTurnCount: Math.abs(sensor.roll || 0) > 35 ? 1 : 0,
        batteryLevel:   100,
      })
      // FIX: read via ref so this callback never uses a stale state value
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

    HelmetUDP.setTarget(targetIp, cfg.port)
    startPing(targetIp)

    connectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && lastPongRef.current === 0) {
        addLog('Connection timeout: no UDP reply from helmet', 'error')
        handleFailureRef.current?.(targetIp)
      }
    }, cfg.connectionTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helmetIp, cfg.port, cfg.connectionTimeout, addLog, clearTimers, markConnected, publishData, startPing])

  // FIX: assign handleFailure to the ref AFTER connect is defined so the
  // retry inside handleFailure can call the latest connect without creating
  // a circular dependency in the dep arrays.
  useEffect(() => {
    handleFailureRef.current = (ip) => {
      clearTimers()
      setSignal(0)

      if (reconnectCount.current < cfg.reconnectAttempts) {
        reconnectCount.current += 1
        setConnectionState(HELMET_STATE.SCANNING)
        addLog(`Retry ${reconnectCount.current}/${cfg.reconnectAttempts} in ${cfg.reconnectDelay / 1000}s`, 'info')
        reconnectTimerRef.current = setTimeout(() => connect(ip), cfg.reconnectDelay)
        return
      }

      reconnectCount.current = 0
      HelmetUDP.destroy()
      setConnectionState(HELMET_STATE.ERROR)
      setError(`Could not reach helmet at ${ip}:4210. Check same WiFi/hotspot and ESP32 IP.`)
      addLog('Max retries reached. Check helmet WiFi and IP.', 'error')
    }
  }, [addLog, clearTimers, cfg.reconnectAttempts, cfg.reconnectDelay, connect])

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
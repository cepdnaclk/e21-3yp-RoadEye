// src/utils/HelmetUDP.js
// Sends navigation data to the ESP32 helmet via binary UDP (PCLink protocol).
//
// Binary header (6 bytes):
//   Byte 0      type        uint8   PKT_* constant
//   Byte 1-2    frameId     uint16  rolling counter, little-endian
//   Byte 3      chunkIdx    uint8   0-based chunk index
//   Byte 4      totalChunks uint8   total chunks in this frame
//   Byte 5      payloadLen  uint8   bytes that follow
//
// Packet types sent to ESP32:
//   PKT_TELEMETRY  (0x03) — lat, lng, speed, heading, temp, humidity, pressure, alt, icon
//   PKT_PING       (0x07) — keepalive every 3 s
//
// Packet types received from ESP32:
//   PKT_SENSOR_OUT (0x04) — BLE sensor readings (distL, distR, distRear, accel, roll, temp, hum, vib, isRiding)
//   PKT_IMU_OUT    (0x05) — raw IMU accel/gyro (accelX/Y/Z, gyroX/Y/Z)
//   PKT_WEAR_OUT   (0x06) — wear state (0=ACTIVE 1=IDLE 2=SLEEPING)
//   PKT_PONG       (0x08) — reply to ping
//
// Usage:
//   import HelmetUDP from './HelmetUDP'
//   HelmetUDP.setTarget('192.168.1.42', 4210)
//   HelmetUDP.send({ type: 'gps', lat, lng, speed, heading })
//   HelmetUDP.onData = (parsed) => console.log(parsed)
//   HelmetUDP.destroy()

// ── Packet type constants (must match PCLink.h) ───────────────────────────────
const PKT_JPEG_CHUNK  = 0x01
const PKT_AUDIO       = 0x02
const PKT_TELEMETRY   = 0x03
const PKT_SENSOR_OUT  = 0x04
const PKT_IMU_OUT     = 0x05
const PKT_WEAR_OUT    = 0x06
const PKT_PING        = 0x07
const PKT_PONG        = 0x08

const HEADER_LEN       = 6
const MAX_CHUNK_PAYLOAD = 250
const WEAR_LABELS      = { 0: 'ACTIVE', 1: 'IDLE', 2: 'SLEEPING' }

// ── react-native-udp (graceful no-op if not installed) ───────────────────────
let UdpSocket = null
try {
  UdpSocket = require('react-native-udp').default
} catch (_) {
  console.warn('[HelmetUDP] react-native-udp not installed — UDP disabled')
}

// ── Binary encode helpers ─────────────────────────────────────────────────────

/**
 * Build the 6-byte PCLink header.
 */
function buildHeader(pktType, frameId, chunkIdx, totalChunks, payloadLen) {
  return [
    pktType,
    frameId & 0xFF,
    (frameId >> 8) & 0xFF,
    chunkIdx,
    totalChunks,
    payloadLen,
  ]
}

/**
 * Write a 32-bit IEEE 754 float into a byte array at offset (little-endian).
 * Works without Buffer/DataView — pure JS bitwise.
 */
function writeFloat32LE(arr, offset, value) {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setFloat32(0, value, true)
  const bytes = new Uint8Array(buf)
  arr[offset]     = bytes[0]
  arr[offset + 1] = bytes[1]
  arr[offset + 2] = bytes[2]
  arr[offset + 3] = bytes[3]
}

/**
 * Write a 16-bit signed int at offset (little-endian).
 */
function writeInt16LE(arr, offset, value) {
  arr[offset]     = value & 0xFF
  arr[offset + 1] = (value >> 8) & 0xFF
}

/**
 * Encode PKT_TELEMETRY payload (31 bytes):
 *   7× float32  lat, lng, speed, heading, tempC, humidity, pressure
 *   1× int16    altitudeM
 *   1× uint8    weatherIcon
 *
 * The app's "gps" message maps to: lat, lng, speed, heading.
 * Weather fields default to 0 unless provided via sendTelemetry() directly.
 */
function encodeTelemetry({ lat = 0, lng = 0, speed = 0, heading = 0,
                           tempC = 0, humidity = 0, pressure = 1013,
                           altitudeM = 0, weatherIcon = 0 }) {
  // 7 floats × 4 bytes = 28, + int16 (2) + uint8 (1) = 31
  const payload = new Array(31).fill(0)
  writeFloat32LE(payload,  0, lat)
  writeFloat32LE(payload,  4, lng)
  writeFloat32LE(payload,  8, speed)
  writeFloat32LE(payload, 12, heading)
  writeFloat32LE(payload, 16, tempC)
  writeFloat32LE(payload, 20, humidity)
  writeFloat32LE(payload, 24, pressure)
  writeInt16LE  (payload, 28, altitudeM)
  payload[30] = weatherIcon & 0xFF
  return payload
}

/**
 * Parse incoming binary datagram from ESP32.
 * Returns null if the packet is too short or unknown.
 */
function parseDatagram(data) {
  // data is a Buffer (node) or Uint8Array
  if (!data || data.length < HEADER_LEN) return null

  const pktType     = data[0]
  const frameId     = data[1] | (data[2] << 8)
  const chunkIdx    = data[3]
  const totalChunks = data[4]
  const payloadLen  = data[5]
  const payload     = data.slice(HEADER_LEN, HEADER_LEN + payloadLen)

  switch (pktType) {
    case PKT_SENSOR_OUT: {
      // 8× float32 + 1× uint8 = 33 bytes
      if (payload.length < 33) return null
      const dv = new DataView(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength
      )
      return {
        type:         'sensor',
        distLeft:     dv.getFloat32( 0, true),
        distRight:    dv.getFloat32( 4, true),
        distRear:     dv.getFloat32( 8, true),
        forwardAccel: dv.getFloat32(12, true),
        roll:         dv.getFloat32(16, true),
        temperature:  dv.getFloat32(20, true),
        humidity:     dv.getFloat32(24, true),
        vibration:    dv.getFloat32(28, true),
        isRiding:     dv.getUint8  (32),
      }
    }

    case PKT_IMU_OUT: {
      // 6× float32 = 24 bytes
      if (payload.length < 24) return null
      const dv = new DataView(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength
      )
      return {
        type:   'imu',
        accelX: dv.getFloat32( 0, true),
        accelY: dv.getFloat32( 4, true),
        accelZ: dv.getFloat32( 8, true),
        gyroX:  dv.getFloat32(12, true),
        gyroY:  dv.getFloat32(16, true),
        gyroZ:  dv.getFloat32(20, true),
      }
    }

    case PKT_WEAR_OUT: {
      if (payload.length < 1) return null
      return {
        type:  'wear',
        state: WEAR_LABELS[payload[0]] ?? 'UNKNOWN',
        raw:   payload[0],
      }
    }

    case PKT_PONG:
      return { type: 'pong', frameId }

    case PKT_PING:
      return { type: 'ping', frameId }

    default:
      return null
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
class _HelmetUDP {
  constructor() {
    this._socket     = null
    this._targetIp   = null
    this._targetPort = 4210
    this._pingTimer  = null
    this._ready      = false
    this._queue      = []          // byte-array packets buffered before socket open
    this._frameId    = 0

    // ── Weather / telemetry context (set externally) ──────────────────────
    // Call HelmetUDP.setWeather({ tempC, humidity, pressure, altitudeM, weatherIcon })
    // and it will be merged into every PKT_TELEMETRY send.
    this._weather = {}

    // ── Callbacks ─────────────────────────────────────────────────────────
    // Set these to receive data from the ESP32:
    //   HelmetUDP.onSensor = (data) => { ... }
    //   HelmetUDP.onImu    = (data) => { ... }
    //   HelmetUDP.onWear   = (data) => { ... }
    //   HelmetUDP.onPong   = ()     => { ... }
    this.onSensor = null
    this.onImu    = null
    this.onWear   = null
    this.onPong   = null
  }

  // ── Public: point at the helmet ───────────────────────────────────────────
  setTarget(ip, port = 4210) {
    this._targetIp   = ip
    this._targetPort = port
    this._initSocket()
  }

  // ── Public: update weather context merged into telemetry ──────────────────
  setWeather(weatherObj) {
    this._weather = { ...this._weather, ...weatherObj }
  }

  // ── Public: high-level send — accepts the same objects your app already sends
  //
  //   { type: 'gps',   lat, lng, speed, heading }     → PKT_TELEMETRY
  //   { type: 'ping'  }                               → PKT_PING
  //   { type: 'step',  arrow, text, dist }            → PKT_TELEMETRY (noop, nav steps
  //                                                      are shown on phone, not in binary
  //                                                      protocol — extend if needed)
  //   { type: 'route', ... }                          → noop (extend if needed)
  //   { type: 'clear' }                               → noop (extend if needed)
  //   { type: 'helmetViewActive', theme }             → noop (extend if needed)
  //
  // For direct binary control use sendTelemetry() / sendPing() / sendJpeg().
  // ─────────────────────────────────────────────────────────────────────────
  send(packet) {
    if (!this._targetIp) return

    switch (packet?.type) {
      case 'gps':
        this.sendTelemetry({
          lat:     packet.lat     ?? 0,
          lng:     packet.lng     ?? 0,
          speed:   packet.speed   ?? 0,
          heading: packet.heading ?? 0,
          ...this._weather,
        })
        break

      case 'ping':
        this.sendPing()
        break

      // Navigation step/route/clear packets — not in the binary PCLink spec
      // by default. Add PKT_NAV_STEP etc. here if you extend the ESP32 firmware.
      case 'step':
      case 'route':
      case 'clear':
      case 'helmetViewActive':
        // No-op in binary protocol (ESP32 gets position via PKT_TELEMETRY,
        // not JSON nav events). Extend here as needed.
        break

      default:
        console.warn('[HelmetUDP] Unknown packet type:', packet?.type)
    }
  }

  // ── Public: send PKT_TELEMETRY directly ──────────────────────────────────
  sendTelemetry(fields = {}) {
    const payload = encodeTelemetry(fields)
    const hdr     = buildHeader(PKT_TELEMETRY, this._nextFrameId(), 0, 1, payload.length)
    this._enqueue([...hdr, ...payload])
  }

  // ── Public: send PKT_PING ─────────────────────────────────────────────────
  sendPing() {
    const hdr = buildHeader(PKT_PING, 0, 0, 1, 0)
    this._enqueue(hdr)
  }

  // ── Public: send a JPEG as chunked PKT_JPEG_CHUNK frames ─────────────────
  // Pass jpeg as a Uint8Array / Buffer.
  sendJpeg(jpegBytes) {
    const total   = Math.ceil(jpegBytes.length / MAX_CHUNK_PAYLOAD)
    const frameId = this._nextFrameId()
    for (let i = 0; i < total; i++) {
      const chunk   = jpegBytes.slice(i * MAX_CHUNK_PAYLOAD, (i + 1) * MAX_CHUNK_PAYLOAD)
      const hdr     = buildHeader(PKT_JPEG_CHUNK, frameId, i, total, chunk.length)
      const pkt     = [...hdr, ...chunk]
      this._enqueue(pkt)
    }
  }

  // ── Public: clear target / close socket ──────────────────────────────────
  destroy() {
    this._stopPing()
    this._queue    = []
    this._ready    = false
    this._weather  = {}
    if (this._socket) {
      try { this._socket.close() } catch (_) {}
      this._socket = null
    }
    this._targetIp = null
  }

  // ── Private ───────────────────────────────────────────────────────────────
  _nextFrameId() {
    const id = this._frameId & 0xFFFF
    this._frameId = (this._frameId + 1) & 0xFFFF
    return id
  }

  _enqueue(byteArray) {
    if (this._ready && this._socket) {
      this._emit(byteArray)
    } else {
      this._queue.push(byteArray)
      if (this._queue.length > 20) this._queue.shift()
    }
  }

  _emit(byteArray) {
    if (!this._socket || !this._targetIp) return
    try {
      // react-native-udp accepts a Buffer.  Convert our plain array:
      const buf = Buffer.from ? Buffer.from(byteArray) : new Uint8Array(byteArray)
      this._socket.send(
        buf, 0, buf.length,
        this._targetPort, this._targetIp,
        (err) => { if (err) console.warn('[HelmetUDP] send error:', err) }
      )
    } catch (e) {
      console.warn('[HelmetUDP] emit error:', e)
    }
  }

  _initSocket() {
    if (!UdpSocket) return

    if (this._socket) {
      try { this._socket.close() } catch (_) {}
      this._socket = null
      this._ready  = false
    }

    try {
      const sock = UdpSocket.createSocket({ type: 'udp4', debug: false })

      sock.bind(0, (err) => {
        if (err) {
          console.warn('[HelmetUDP] bind error:', err)
          return
        }
        this._ready = true

        // Flush queued packets
        const q = this._queue.splice(0)
        q.forEach(pkt => this._emit(pkt))

        this._startPing()
      })

      // ── Receive incoming ESP32 data ───────────────────────────────────
      sock.on('message', (data, rinfo) => {
        // data may be a Buffer or Uint8Array depending on platform
        let arr
        if (data instanceof Uint8Array) {
          arr = data
        } else if (typeof data === 'string') {
          // Shouldn't happen with binary, but guard anyway
          arr = new Uint8Array([...data].map(c => c.charCodeAt(0)))
        } else {
          arr = new Uint8Array(data)
        }

        const parsed = parseDatagram(arr)
        if (!parsed) return

        switch (parsed.type) {
          case 'sensor':
            this.onSensor?.(parsed)
            break
          case 'imu':
            this.onImu?.(parsed)
            break
          case 'wear':
            this.onWear?.(parsed)
            break
          case 'pong':
            this.onPong?.()
            break
          case 'ping':
            // Reply with pong
            this._emit(buildHeader(PKT_PONG, 0, 0, 1, 0))
            break
          default:
            break
        }
      })

      sock.on('error', (err) => {
        console.warn('[HelmetUDP] socket error:', err)
        this._ready = false
      })

      this._socket = sock
    } catch (e) {
      console.warn('[HelmetUDP] createSocket failed:', e)
    }
  }

  _startPing() {
    this._stopPing()
    this._pingTimer = setInterval(() => {
      this.sendPing()
    }, 3000)
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer)
      this._pingTimer = null
    }
  }
}

export default new _HelmetUDP()
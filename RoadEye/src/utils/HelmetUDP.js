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
//   PKT_SENSOR_OUT (0x04) — BLE sensor readings
//   PKT_IMU_OUT    (0x05) — raw IMU accel/gyro
//   PKT_WEAR_OUT   (0x06) — wear state (0=ACTIVE 1=IDLE 2=SLEEPING)
//   PKT_PONG       (0x08) — reply to ping
import { Buffer } from 'buffer'
// ── Packet type constants (must match PCLink.h) ───────────────────────────────
const PKT_JPEG_CHUNK   = 0x01
const PKT_AUDIO        = 0x02
const PKT_TELEMETRY    = 0x03
const PKT_SENSOR_OUT   = 0x04
const PKT_IMU_OUT      = 0x05
const PKT_WEAR_OUT     = 0x06
const PKT_PING         = 0x07
const PKT_PONG         = 0x08

const HEADER_LEN        = 6
const MAX_CHUNK_PAYLOAD = 250
const WEAR_LABELS       = { 0: 'ACTIVE', 1: 'IDLE', 2: 'SLEEPING' }

const LISTEN_PORT = 4210

// ── react-native-udp (graceful no-op if not installed) ───────────────────────
let UdpSocket = null
try {
  UdpSocket = require('react-native-udp')
} catch (_) {
  console.warn('[HelmetUDP] react-native-udp not installed — UDP disabled')
}
// ── Binary encode helpers ─────────────────────────────────────────────────────

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

function writeFloat32LE(arr, offset, value) {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setFloat32(0, value, true)
  const bytes = new Uint8Array(buf)
  arr[offset]     = bytes[0]
  arr[offset + 1] = bytes[1]
  arr[offset + 2] = bytes[2]
  arr[offset + 3] = bytes[3]
}

function writeInt16LE(arr, offset, value) {
  arr[offset]     = value & 0xFF
  arr[offset + 1] = (value >> 8) & 0xFF
}

function encodeTelemetry({ lat = 0, lng = 0, speed = 0, heading = 0,
                           tempC = 0, humidity = 0, pressure = 1013,
                           altitudeM = 0, weatherIcon = 0 }) {
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

function parseDatagram(data) {
  if (!data || data.length < HEADER_LEN) return null

  const pktType    = data[0]
  const frameId    = data[1] | (data[2] << 8)
  // chunkIdx / totalChunks unused on receive side for now
  const payloadLen = data[5]
  const payload    = data.slice(HEADER_LEN, HEADER_LEN + payloadLen)

  switch (pktType) {
    case PKT_SENSOR_OUT: {
      if (payload.length < 33) return null
      const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
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
      if (payload.length < 24) return null
      const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
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
    this._ready      = false
    this._queue      = []
    this._frameId    = 0
    this._weather    = {}

    this.onSensor    = null
    this.onImu       = null
    this.onWear      = null
    this.onPong      = null
    this.onTelemetry = null
  }

  setTarget(ip, port = 4210) {
    this._targetIp   = ip
    this._targetPort = port
    this._initSocket()
  }

  setWeather(weatherObj) {
    this._weather = { ...this._weather, ...weatherObj }
  }

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
      case 'step':
      case 'route':
      case 'clear':
      case 'helmetViewActive':
        break
      default:
        console.warn('[HelmetUDP] Unknown packet type:', packet?.type)
    }
  }

  sendTelemetry(fields = {}) {
    const payload = encodeTelemetry(fields)
    const hdr     = buildHeader(PKT_TELEMETRY, this._nextFrameId(), 0, 1, payload.length)
    this._enqueue([...hdr, ...payload])
  }

  sendPing() {
    const hdr = buildHeader(PKT_PING, 0, 0, 1, 0)
    this._enqueue(hdr)
  }

  sendJpeg(jpegBytes) {
    const total   = Math.ceil(jpegBytes.length / MAX_CHUNK_PAYLOAD)
    const frameId = this._nextFrameId()
    for (let i = 0; i < total; i++) {
      const chunk = jpegBytes.slice(i * MAX_CHUNK_PAYLOAD, (i + 1) * MAX_CHUNK_PAYLOAD)
      const hdr   = buildHeader(PKT_JPEG_CHUNK, frameId, i, total, chunk.length)
      this._enqueue([...hdr, ...chunk])
    }
  }

  destroy() {
    this._queue   = []
    this._ready   = false
    this._weather = {}
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
    if (!this._socket || !this._targetIp) {
      console.warn(`[HelmetUDP] _emit skipped — socket=${!!this._socket} targetIp=${this._targetIp}`)
      return
    }
    try {
      const buf = new Uint8Array(byteArray)
      console.log(`[HelmetUDP] 📤 Sending ${buf.length}B to ${this._targetIp}:${this._targetPort}  type=0x${byteArray[0]?.toString(16)}`)
      this._socket.send(
        buf, 0, buf.length,
        this._targetPort, this._targetIp,
        (err) => {
          if (err) console.error('[HelmetUDP] ❌ send error:', err)
          else     console.log('[HelmetUDP] ✅ send ok')
        }
      )
    } catch (e) {
      console.error('[HelmetUDP] ❌ emit error:', e)
    }
  }

  _initSocket() {
    if (!UdpSocket) {
      console.error('[HelmetUDP] ❌ react-native-udp not available — install it: yarn add react-native-udp')
      return
    }

    // Close any existing socket cleanly before creating a new one
    if (this._socket) {
      try { this._socket.close() } catch (_) {}
      this._socket = null
      this._ready  = false
    }

    console.log(`[HelmetUDP] Creating socket → binding :${LISTEN_PORT} on 0.0.0.0, target ${this._targetIp}:${this._targetPort}`)

    try {
      const sock = UdpSocket.createSocket({ type: 'udp4', debug: true })

      // Attach message/error/close handlers immediately BEFORE bind() so
      // no packets arriving during the bind window are missed.
      // FIX: _socket is assigned here (not inside the bind callback) for
      // exactly this reason — handlers are live as soon as the socket exists.
      this._socket = sock

      sock.on('message', (data, rinfo) => {
        console.log(`[HelmetUDP] 📨 Packet from ${rinfo?.address}:${rinfo?.port}  len=${data?.length}  bytes=[${Array.from(data?.slice?.(0, 8) ?? []).join(',')}]`)

        let arr
        if (data instanceof Uint8Array) {
          arr = data
        } else if (typeof data === 'string') {
          arr = new Uint8Array([...data].map(c => c.charCodeAt(0)))
        } else {
          arr = new Uint8Array(data)
        }

        const parsed = parseDatagram(arr)
        if (!parsed) {
          console.warn('[HelmetUDP] ⚠️ parseDatagram returned null — unknown type or packet too short')
          return
        }

        console.log(`[HelmetUDP] Parsed → type="${parsed.type}"`)

        switch (parsed.type) {
          case 'sensor':
            this.onSensor?.(parsed)
            break
          case 'imu':
            this.onImu?.(parsed)
            break
          case 'wear':
            // Pass parsed.state (string e.g. 'ACTIVE'), not the full object
            this.onWear?.(parsed.state)
            break
          case 'pong':
            console.log('[HelmetUDP] ✅ PONG received!')
            this.onPong?.()
            break
          case 'ping':
            // ESP32 sent a ping — reply with a pong
            this._emit(buildHeader(PKT_PONG, 0, 0, 1, 0))
            break
          default:
            break
        }
      })

      sock.on('error', (err) => {
        console.warn('[HelmetUDP] socket error:', err?.code, err?.message)
        this._ready = false
      })

      sock.on('close', () => {
        console.log('[HelmetUDP] socket closed')
        this._ready = false
      })

      // Bind to 0.0.0.0 so we listen on ALL interfaces — critical when the
      // phone is acting as a hotspot (hotspot iface is separate from WiFi).
      sock.bind(LISTEN_PORT, '0.0.0.0', (err) => {
        if (err) {
          // FIX: log error code for diagnosability (EADDRINUSE, EACCES, etc.)
          console.error(`[HelmetUDP] ❌ bind(:${LISTEN_PORT}) failed — code: ${err?.code}  msg: ${err?.message}`)
          // Socket is broken — null it out so _enqueue won't try to use it
          this._socket = null
          this._ready  = false
          return
        }

        console.log(`[HelmetUDP] ✅ Bound and listening on 0.0.0.0:${LISTEN_PORT}`)

        // FIX: only mark ready AFTER bind succeeds. Packets queued before
        // this point are flushed now — safe because the socket is fully live.
        this._ready = true

        const q = this._queue.splice(0)
        if (q.length) console.log(`[HelmetUDP] Flushing ${q.length} queued packet(s)`)
        q.forEach(pkt => this._emit(pkt))
      })

    } catch (e) {
      console.warn('[HelmetUDP] createSocket threw:', e?.message ?? e)
      this._socket = null
      this._ready  = false
    }
  }
}

export default new _HelmetUDP()
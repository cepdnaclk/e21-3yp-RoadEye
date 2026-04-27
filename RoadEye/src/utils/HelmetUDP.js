// src/utils/HelmetUDP.js
// Sends/receives data to/from the ESP32 helmet via binary UDP (PCLink protocol).
//
// Binary header (6 bytes):
//   Byte 0      type        uint8   PKT_* constant
//   Byte 1-2    frameId     uint16  rolling counter, little-endian
//   Byte 3      chunkIdx    uint8   0-based chunk index
//   Byte 4      totalChunks uint8   total chunks in this frame
//   Byte 5      payloadLen  uint8   bytes that follow (0–250)
//
// Packet types sent TO ESP32 (PC → ESP32):
//   PKT_JPEG_CHUNK  (0x01) — map image chunk
//   PKT_AUDIO       (0x02) — PCM audio chunk
//   PKT_NAVIGATION  (0x03) — speed, distRemaining, completionPct, startWeather, destWeather
//   PKT_MEDIA       (0x04) — progressPct (float) + songName (null-term) + author (null-term)
//   PKT_DATETIME    (0x05) — year(uint16) month day hour minute second
//   PKT_WEATHER     (0x06) — tempC, humidity (floats) + weatherIcon (uint8)
//   PKT_PING        (0x07) — keepalive
//
// Packet types received FROM ESP32 (ESP32 → PC):
//   PKT_SENSOR_OUT  (0x10) — BLE sensor readings (33 bytes)
//   PKT_IMU_OUT     (0x11) — raw IMU accel/gyro  (24 bytes)
//   PKT_WEAR_OUT    (0x12) — wear state: 0=ACTIVE 1=IDLE 2=SLEEPING
//   PKT_PONG        (0x08) — reply to ping
//
// Weather icon values: 1=sunny  2=cloudy  3=rain

import { Buffer } from 'buffer'

// ── Packet type constants (must match PCLink.h) ───────────────────────────────
const PKT_JPEG_CHUNK  = 0x01  // PC → ESP32 : map image chunk
const PKT_AUDIO       = 0x02  // PC → ESP32 : PCM audio chunk
const PKT_NAVIGATION  = 0x03  // PC → ESP32 : navigation data
const PKT_MEDIA       = 0x04  // PC → ESP32 : media / now-playing
const PKT_DATETIME    = 0x05  // PC → ESP32 : current date and time
const PKT_WEATHER     = 0x06  // PC → ESP32 : local weather
const PKT_PING        = 0x07  // bidirectional keepalive
const PKT_PONG        = 0x08  // reply to ping
const PKT_SENSOR_OUT  = 0x10  // ESP32 → PC : BLE sensor readings
const PKT_IMU_OUT     = 0x11  // ESP32 → PC : raw IMU data
const PKT_WEAR_OUT    = 0x12  // ESP32 → PC : wear state

// ── Weather icon constants (must match WeatherIcon namespace in PCLink.h) ─────
export const WeatherIcon = {
  SUNNY:  1,
  CLOUDY: 2,
  RAIN:   3,
}

const HEADER_LEN        = 6
const MAX_CHUNK_PAYLOAD = 250
const WEAR_LABELS       = { 0: 'ACTIVE', 1: 'IDLE', 2: 'SLEEPING' }
const LISTEN_PORT       = 4210

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

function writeUint16LE(arr, offset, value) {
  arr[offset]     = value & 0xFF
  arr[offset + 1] = (value >> 8) & 0xFF
}

// ── NavigationPacket encoder ──────────────────────────────────────────────────
// Matches struct NavigationPacket in PCLink.h (14 bytes, packed):
//   float  speed           (4 bytes) km/h
//   float  distRemaining   (4 bytes) km
//   float  completionPct   (4 bytes) 0.0–100.0
//   uint8  startWeather    (1 byte)  WeatherIcon
//   uint8  destWeather     (1 byte)  WeatherIcon
function encodeNavigation({
  speed         = 0,
  distRemaining = 0,
  completionPct = 0,
  startWeather  = WeatherIcon.SUNNY,
  destWeather   = WeatherIcon.SUNNY,
}) {
  const payload = new Array(14).fill(0)
  writeFloat32LE(payload,  0, speed)
  writeFloat32LE(payload,  4, distRemaining)
  writeFloat32LE(payload,  8, completionPct)
  payload[12] = startWeather & 0xFF
  payload[13] = destWeather  & 0xFF
  return payload
}

// ── MediaPacket encoder ───────────────────────────────────────────────────────
// Matches MediaPacket layout in PCLink.h (variable length, ≤ 250 bytes):
//   [0..3]  progressPct  float   0.0–100.0
//   [4]     songName     char[]  null-terminated UTF-8
//   [4+n]   author       char[]  null-terminated UTF-8
function encodeMedia({
  progressPct = 0,
  songName    = '',
  author      = '',
}) {
  const songBytes   = [...songName].map(c => c.charCodeAt(0) & 0xFF)
  const authorBytes = [...author  ].map(c => c.charCodeAt(0) & 0xFF)

  // Truncate to fit within MAX_CHUNK_PAYLOAD:
  //   4 (float) + songLen + 1 (NUL) + authorLen + 1 (NUL) ≤ 250
  const maxAuthorLen = MAX_CHUNK_PAYLOAD - 4 - songBytes.length - 1 - 1
  const safeSong     = songBytes.slice(0, Math.min(songBytes.length,   63))
  const safeAuthor   = authorBytes.slice(0, Math.min(maxAuthorLen,     47))

  const payload = new Array(4 + safeSong.length + 1 + safeAuthor.length + 1).fill(0)
  writeFloat32LE(payload, 0, progressPct)
  let offset = 4
  safeSong.forEach(b   => { payload[offset++] = b })
  payload[offset++] = 0                             // NUL-terminate songName
  safeAuthor.forEach(b => { payload[offset++] = b })
  payload[offset]   = 0                             // NUL-terminate author
  return payload
}

// ── DateTimePacket encoder ────────────────────────────────────────────────────
// Matches struct DateTimePacket in PCLink.h (7 bytes, packed):
//   uint16 year    (2 bytes)
//   uint8  month   (1 byte)  1–12
//   uint8  day     (1 byte)  1–31
//   uint8  hour    (1 byte)  0–23
//   uint8  minute  (1 byte)  0–59
//   uint8  second  (1 byte)  0–59
function encodeDateTime(date = new Date()) {
  const payload = new Array(7).fill(0)
  writeUint16LE(payload, 0, date.getFullYear())
  payload[2] = date.getMonth() + 1   // JS months are 0-based
  payload[3] = date.getDate()
  payload[4] = date.getHours()
  payload[5] = date.getMinutes()
  payload[6] = date.getSeconds()
  return payload
}

// ── WeatherPacket encoder ─────────────────────────────────────────────────────
// Matches struct WeatherPacket in PCLink.h (9 bytes, packed):
//   float  tempC       (4 bytes) °C
//   float  humidity    (4 bytes) %
//   uint8  weatherIcon (1 byte)  WeatherIcon
function encodeWeather({
  tempC       = 0,
  humidity    = 0,
  weatherIcon = WeatherIcon.SUNNY,
}) {
  const payload = new Array(9).fill(0)
  writeFloat32LE(payload, 0, tempC)
  writeFloat32LE(payload, 4, humidity)
  payload[8] = weatherIcon & 0xFF
  return payload
}

// ── Inbound packet parser ─────────────────────────────────────────────────────
function parseDatagram(data) {
  if (!data || data.length < HEADER_LEN) return null

  const pktType    = data[0]
  const frameId    = data[1] | (data[2] << 8)
  // chunkIdx [3] / totalChunks [4] unused on receive side for now
  const payloadLen = data[5]
  const payload    = data.slice(HEADER_LEN, HEADER_LEN + payloadLen)

  switch (pktType) {

    // ── SensorOutPacket (0x10) — 33 bytes ──────────────────────────────────
    // float distLeft, distRight, distRear, forwardAccel, roll,
    //       temperature, humidity, vibration  (8 × 4 = 32 bytes)
    // uint8 isRiding                          (1 byte)
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

    // ── ImuOutPacket (0x11) — 24 bytes ─────────────────────────────────────
    // float accelX, accelY, accelZ, gyroX, gyroY, gyroZ  (6 × 4 = 24 bytes)
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

    // ── WearOut (0x12) — 1 byte ─────────────────────────────────────────────
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

    // Callbacks
    this.onSensor = null
    this.onImu    = null
    this.onWear   = null
    this.onPong   = null
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  setTarget(ip, port = 4210) {
    if (this._targetIp === ip && this._targetPort === port && this._socket) {
      return  // ← ADD THIS: Don't destroy/recreate if already connected to this IP
  }
    this._targetIp   = ip
    this._targetPort = port
    this._initSocket()
  }

  // ── Send helpers ───────────────────────────────────────────────────────────

  /**
   * Send a NavigationPacket (PKT_NAVIGATION 0x03).
   * @param {object} fields
   * @param {number} fields.speed          km/h
   * @param {number} fields.distRemaining  km remaining
   * @param {number} fields.completionPct  0.0–100.0
   * @param {number} fields.startWeather   WeatherIcon constant
   * @param {number} fields.destWeather    WeatherIcon constant
   */
  sendNavigation(fields = {}) {
    const payload = encodeNavigation(fields)
    const hdr     = buildHeader(PKT_NAVIGATION, this._nextFrameId(), 0, 1, payload.length)
    this._enqueue([...hdr, ...payload])
  }

  /**
   * Send a MediaPacket (PKT_MEDIA 0x04).
   * @param {object} fields
   * @param {number} fields.progressPct  0.0–100.0
   * @param {string} fields.songName
   * @param {string} fields.author
   */
  sendMedia(fields = {}) {
    const payload = encodeMedia(fields)
    const hdr     = buildHeader(PKT_MEDIA, this._nextFrameId(), 0, 1, payload.length)
    this._enqueue([...hdr, ...payload])
  }

  /**
   * Send a DateTimePacket (PKT_DATETIME 0x05).
   * @param {Date} [date]  defaults to now
   */
  sendDateTime(date = new Date()) {
    const payload = encodeDateTime(date)
    const hdr     = buildHeader(PKT_DATETIME, this._nextFrameId(), 0, 1, payload.length)
    this._enqueue([...hdr, ...payload])
  }

  /**
   * Send a WeatherPacket (PKT_WEATHER 0x06).
   * @param {object} fields
   * @param {number} fields.tempC
   * @param {number} fields.humidity
   * @param {number} fields.weatherIcon  WeatherIcon constant
   */
  sendWeather(fields = {}) {
    const payload = encodeWeather(fields)
    const hdr     = buildHeader(PKT_WEATHER, this._nextFrameId(), 0, 1, payload.length)
    this._enqueue([...hdr, ...payload])
  }

  /**
   * Send a JPEG map frame split into ≤250-byte chunks (PKT_JPEG_CHUNK 0x01).
   * @param {Uint8Array|number[]} jpegBytes
   */
  sendJpeg(jpegBytes) {
    const total   = Math.ceil(jpegBytes.length / MAX_CHUNK_PAYLOAD)
    const frameId = this._nextFrameId()
    for (let i = 0; i < total; i++) {
      const chunk = jpegBytes.slice(i * MAX_CHUNK_PAYLOAD, (i + 1) * MAX_CHUNK_PAYLOAD)
      const hdr   = buildHeader(PKT_JPEG_CHUNK, frameId, i, total, chunk.length)
      this._enqueue([...hdr, ...chunk])
    }
  }

  /**
   * Send a raw PCM audio chunk (PKT_AUDIO 0x02).
   * @param {Uint8Array|number[]} pcmBytes  8-bit unsigned, 8 kHz mono, ≤250 bytes
   */
  sendAudio(pcmBytes) {
    const chunk = pcmBytes.slice(0, MAX_CHUNK_PAYLOAD)
    const hdr   = buildHeader(PKT_AUDIO, this._nextFrameId(), 0, 1, chunk.length)
    this._enqueue([...hdr, ...chunk])
  }

  /** Send a keepalive ping (PKT_PING 0x07). */
  sendPing() {
    const hdr = buildHeader(PKT_PING, 0, 0, 1, 0)
    this._enqueue(hdr)
  }

  /**
   * Generic send dispatcher — routes a high-level packet object to the
   * appropriate encode + send method.
   */
  send(packet) {
    if (!this._targetIp) return

    switch (packet?.type) {
      case 'navigation':
        this.sendNavigation(packet)
        break
      case 'media':
        this.sendMedia(packet)
        break
      case 'datetime':
        this.sendDateTime(packet.date)
        break
      case 'weather':
        this.sendWeather(packet)
        break
      case 'jpeg':
        this.sendJpeg(packet.bytes)
        break
      case 'audio':
        this.sendAudio(packet.bytes)
        break
      case 'ping':
        this.sendPing()
        break
      default:
        console.warn('[HelmetUDP] Unknown packet type:', packet?.type)
    }
  }

  destroy() {
    this._queue = []
    this._ready = false
    if (this._socket) {
      try { this._socket.close() } catch (_) {}
      this._socket = null
    }
    this._targetIp = null
  }

  /** Returns true if we have a valid target IP and socket is ready to send. */
  hasPeerIP() {
    return !!this._targetIp && this._ready
  }

  // ── Private ────────────────────────────────────────────────────────────────

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

      // Assign _socket before bind() so message/error handlers are live
      // immediately and no packets arriving during bind are missed.
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
            this.onWear?.(parsed.state)   // passes string e.g. 'ACTIVE'
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
      // phone acts as a hotspot (hotspot iface is separate from the WiFi iface).
      sock.bind(LISTEN_PORT, '0.0.0.0', (err) => {
        if (err) {
          console.error(`[HelmetUDP] ❌ bind(:${LISTEN_PORT}) failed — code: ${err?.code}  msg: ${err?.message}`)
          this._socket = null
          this._ready  = false
          return
        }

        console.log(`[HelmetUDP] ✅ Bound and listening on 0.0.0.0:${LISTEN_PORT}`)

        this._ready = true

        // Flush any packets that were queued before the socket was ready
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
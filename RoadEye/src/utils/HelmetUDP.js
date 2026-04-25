// src/utils/HelmetUDP.js
// Sends navigation map state to the ESP32 helmet via UDP.
// The helmet renders the received data on its own display — dark bg, white roads.
//
// Packet types sent:
//   { type: 'gps',   lat, lng, speed }          — live position
//   { type: 'step',  arrow, text, dist }         — current nav instruction
//   { type: 'route', destination, distKm, etaMin, destLat, destLng }
//   { type: 'clear' }                            — route cancelled / arrived
//   { type: 'ping' }                             — keepalive every 3 s
//
// Usage:
//   import HelmetUDP from './HelmetUDP'
//   HelmetUDP.setTarget('192.168.4.1', 4210)     // helmet IP + UDP port
//   HelmetUDP.send({ type: 'gps', lat, lng, speed })
//   HelmetUDP.destroy()                          // on app close

import { NativeModules, Platform } from 'react-native'

// react-native-udp  ──  install with:
//   npm install react-native-udp
//   npx pod-install   (iOS)
// If not yet installed the module gracefully no-ops so the rest of the app
// keeps working; you will see a console.warn.
let UdpSocket = null
try {
  UdpSocket = require('react-native-udp').default
} catch (_) {
  console.warn('[HelmetUDP] react-native-udp not installed — UDP disabled')
}

// ── Singleton ─────────────────────────────────────────────────────────────────
class _HelmetUDP {
  constructor() {
    this._socket     = null
    this._targetIp   = null
    this._targetPort = 4210          // default; helmet firmware listens here
    this._pingTimer  = null
    this._ready      = false
    this._queue      = []            // packets buffered before socket is open
  }

  // ── Public: point at the helmet ───────────────────────────────────────────
  setTarget(ip, port = 4210) {
    this._targetIp   = ip
    this._targetPort = port
    this._initSocket()
  }

  // ── Public: send any packet ───────────────────────────────────────────────
  send(packet) {
    if (!this._targetIp) return
    const buf = this._encode(packet)
    if (!buf) return

    if (this._ready && this._socket) {
      this._emit(buf)
    } else {
      // Buffer up to 10 packets while socket is opening
      this._queue.push(buf)
      if (this._queue.length > 10) this._queue.shift()
    }
  }

  // ── Public: clear target / close socket ──────────────────────────────────
  destroy() {
    this._stopPing()
    this._queue = []
    this._ready = false
    if (this._socket) {
      try { this._socket.close() } catch (_) {}
      this._socket = null
    }
    this._targetIp = null
  }

  // ── Private ───────────────────────────────────────────────────────────────
  _encode(packet) {
    try {
      const json = JSON.stringify(packet)
      // react-native-udp expects a Buffer or string
      return json
    } catch (_) {
      return null
    }
  }

  _emit(buf) {
    if (!this._socket || !this._targetIp) return
    try {
      this._socket.send(buf, 0, buf.length, this._targetPort, this._targetIp, (err) => {
        if (err) console.warn('[HelmetUDP] send error:', err)
      })
    } catch (e) {
      console.warn('[HelmetUDP] emit error:', e)
    }
  }

  _initSocket() {
    if (!UdpSocket) return

    // Close old socket if re-configuring
    if (this._socket) {
      try { this._socket.close() } catch (_) {}
      this._socket = null
      this._ready  = false
    }

    try {
      const sock = UdpSocket.createSocket({ type: 'udp4', debug: false })

      sock.bind(0, (err) => {           // bind to any available local port
        if (err) {
          console.warn('[HelmetUDP] bind error:', err)
          return
        }
        this._ready = true

        // Flush queued packets
        const q = this._queue.splice(0)
        q.forEach(buf => this._emit(buf))

        // Start keepalive ping
        this._startPing()
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
      this.send({ type: 'ping', ts: Date.now() })
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

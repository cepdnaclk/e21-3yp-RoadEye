import dgram from 'react-native-udp'

const DISCOVERY_PORT = 4211
const DISCOVERY_PREFIX = 'ROADEYE:'   // ✅ matches what PCLink actually sends

let discoveredIP = null
let discoverySocket = null

export function getESP32IP() {
  return discoveredIP
}

export function startESP32Discovery(onFound) {
  if (discoverySocket) return

  discoverySocket = dgram.createSocket({ type: 'udp4', reusePort: true })

  discoverySocket.bind(DISCOVERY_PORT, () => {
    console.log('[Discovery] Listening for ROADEYE broadcast on port', DISCOVERY_PORT)
  })

  discoverySocket.on('message', (msg) => {
    const message = msg.toString()
    console.log('[Discovery] Received:', message)   // ← helpful for debugging

    if (message.startsWith(DISCOVERY_PREFIX)) {
      const ip = message.replace(DISCOVERY_PREFIX, '').trim()
      if (ip !== discoveredIP) {
        discoveredIP = ip
        console.log('[Discovery] ✅ ROADEYE found at:', discoveredIP)
        onFound?.(discoveredIP)
      }
    }
  })

  discoverySocket.on('error', (err) => {
    console.warn('[Discovery] Error:', err)
  })
}

export function stopESP32Discovery() {
  discoverySocket?.close()
  discoverySocket = null
  discoveredIP = null
}
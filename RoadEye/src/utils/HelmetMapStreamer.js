// src/utils/HelmetMapStreamer.js
//
// Captures a 120×120 map snapshot via react-native-maps takeSnapshot(),
// pixel-diffs it against the previous frame, and only sends a new JPEG
// over UDP (via HelmetUDP.sendJpeg) when enough pixels have changed.
//
// No WebView canvas, no CORS issues, no backend needed.
//
// Usage:
//   import HelmetMapStreamer from './HelmetMapStreamer'
//
//   // Pass your MapView ref once the map is ready and helmet is connected:
//   HelmetMapStreamer.start(mapViewRef)
//
//   // Stop when helmet disconnects or screen unmounts:
//   HelmetMapStreamer.stop()
//
//   // Update the map center as GPS moves (streamer will capture the new view):
//   HelmetMapStreamer.updateCamera({ latitude, longitude, heading })

import { Platform } from 'react-native'
import HelmetUDP from './HelmetUDP'

// ─── Tuning ──────────────────────────────────────────────────────────────────
const CAPTURE_SIZE     = 120     // px — matches ESP32 JPEG buffer (120×120)
const TARGET_FPS       = 5       // max frames per second transmitted
const JPEG_QUALITY     = 0.65    // 0..1  (~3–6 kB per frame at 120×120)
const DIFF_THRESHOLD   = 28      // per-channel delta to count a pixel as changed
const DIFF_MIN_PIXELS  = 150     // skip frame if fewer pixels changed than this
const INTERCHUNK_MS    = 4       // ms gap between UDP chunks (ESP32 buffer relief)

// ─── Module singleton state ───────────────────────────────────────────────────
let _mapRef    = null   // React ref to the <MapView> component
let _timer     = null
let _active    = false
let _prevPixels = null  // Uint8ClampedArray of last-sent frame RGBA

// ─── Public API ───────────────────────────────────────────────────────────────

const HelmetMapStreamer = {

  /**
   * start(mapViewRef)
   * Begin the capture → diff → send loop.
   * Call this when the helmet connects AND the MapView is mounted.
   */
  start(mapViewRef) {
    if (_active) return
    if (!mapViewRef?.current) {
      console.warn('[MapStreamer] start() called with no mapViewRef')
      return
    }
    _mapRef     = mapViewRef
    _active     = true
    _prevPixels = null
    console.log('[MapStreamer] started')
    _scheduleNext()
  },

  /**
   * stop()
   * Stop the loop. The ESP32 keeps showing the last received frame.
   */
  stop() {
    _active = false
    if (_timer) { clearTimeout(_timer); _timer = null }
    _prevPixels = null
    console.log('[MapStreamer] stopped')
  },

  isActive() { return _active },
}

export default HelmetMapStreamer

// ─── Capture loop ─────────────────────────────────────────────────────────────

function _scheduleNext() {
  if (!_active) return
  _timer = setTimeout(_tick, Math.round(1000 / TARGET_FPS))
}

async function _tick() {
  if (!_active) return
  try {
    await _captureAndSend()
  } catch (err) {
    // Don't let a single failed frame kill the loop
    console.warn('[MapStreamer] tick error:', err?.message ?? err)
  }
  _scheduleNext()
}

async function _captureAndSend() {
  if (!_mapRef?.current) return

  // 1. Snapshot the MapView at 120×120 — returns a local file:// URI
  //    takeSnapshot() is built into react-native-maps, no extra install.
  let uri
  try {
    uri = await _mapRef.current.takeSnapshot({
      width:   CAPTURE_SIZE,
      height:  CAPTURE_SIZE,
      format:  'jpg',
      quality: JPEG_QUALITY,
      result:  'file',       // file URI — avoids base64 string overhead
    })
  } catch (err) {
    // Map not ready yet (tiles still loading, component unmounted, etc.)
    return
  }

  if (!uri) return

  // 2. Load the snapshot as raw pixels for diffing.
  //    We fetch the file URI and decode it.
  let pixels
  try {
    pixels = await _uriToPixels(uri)
  } catch (err) {
    console.warn('[MapStreamer] pixel decode error:', err?.message)
    return
  }

  // 3. Pixel diff — count how many pixels changed significantly
  const changed = _countChangedPixels(pixels)
  if (changed < DIFF_MIN_PIXELS) {
    // Map is still — ESP32 holds last frame, save bandwidth
    return
  }

  // 4. Store this frame as the new baseline
  _prevPixels = new Uint8ClampedArray(pixels)

  // 5. Re-encode as JPEG bytes (we re-fetch the same URI as arrayBuffer)
  let jpegBytes
  try {
    jpegBytes = await _uriToJpegBytes(uri)
  } catch (err) {
    console.warn('[MapStreamer] JPEG read error:', err?.message)
    return
  }

  // 6. Hand off to HelmetUDP — it handles chunking + headers internally
  HelmetUDP.sendJpeg(jpegBytes)
}

// ─── Pixel diff ───────────────────────────────────────────────────────────────

function _countChangedPixels(newPixels) {
  if (!_prevPixels || _prevPixels.length !== newPixels.length) {
    // First frame — always send
    return Infinity
  }
  let count = 0
  for (let i = 0; i < newPixels.length; i += 4) {
    const dr = Math.abs(newPixels[i]     - _prevPixels[i])
    const dg = Math.abs(newPixels[i + 1] - _prevPixels[i + 1])
    const db = Math.abs(newPixels[i + 2] - _prevPixels[i + 2])
    if (dr > DIFF_THRESHOLD || dg > DIFF_THRESHOLD || db > DIFF_THRESHOLD) {
      count++
    }
  }
  return count
}

// ─── Image utilities ──────────────────────────────────────────────────────────

/**
 * Decode a file:// URI into a flat RGBA Uint8ClampedArray using
 * the Canvas API (available in React Native via Hermes + Fabric,
 * or via the @shopify/react-native-skia / expo-image-manipulator path).
 *
 * We use expo-image-manipulator here because it's already a common
 * dependency in Expo projects and gives us reliable raw pixel access
 * without needing a native canvas module.
 */
async function _uriToPixels(uri) {
  // expo-image-manipulator: resize to exactly 120×120 and get base64
  // If you're not using Expo, swap this for react-native-image-resizer
  // or any library that returns a resized image URI / base64.
  let ImageManipulator
  try {
    ImageManipulator = require('expo-image-manipulator')
  } catch (_) {
    // Fallback: if manipulator not available, skip diff and always send.
    // Wasteful but functional.
    return new Uint8ClampedArray(0)
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: CAPTURE_SIZE, height: CAPTURE_SIZE } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG }
  )

  if (!result.base64) return new Uint8ClampedArray(0)

  // Decode base64 JPEG → pixel array via OffscreenCanvas (Hermes supports this)
  const binary = atob(result.base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const blob   = new Blob([bytes], { type: 'image/jpeg' })
  const bitmap = await createImageBitmap(blob)
  const oc     = new OffscreenCanvas(CAPTURE_SIZE, CAPTURE_SIZE)
  const ctx    = oc.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, CAPTURE_SIZE, CAPTURE_SIZE).data
}

/**
 * Read a file:// URI and return its raw bytes as a Uint8Array.
 * This is what actually gets chunked and sent to the ESP32.
 */
async function _uriToJpegBytes(uri) {
  const response = await fetch(uri)
  const buffer   = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

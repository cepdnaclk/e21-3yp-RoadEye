// src/utils/HelmetMapStreamer.js
//
// Captures the navigation map by injecting a canvas snapshot request into
// the existing Leaflet WebView — no react-native-maps, no native modules,
// no CORS issues (tiles are already rendered in the page).
//
// How it works:
//   1. Every 200 ms (5 fps) we inject a JS snippet into the WebView that
//      stitches all visible Leaflet tile <img> elements + the route canvas
//      into a 120x120 <canvas> and postMessages the result as a base64 JPEG.
//   2. NavigationScreen receives that message in onWebViewMessage and calls
//      HelmetMapStreamer.ingestFrame(base64).
//   3. We decode base64 -> Uint8Array, pixel-diff against the last frame,
//      and only call HelmetUDP.sendJpeg() when enough pixels changed.
//
// Usage (see NavigationScreen.js for wiring):
//   HelmetMapStreamer.start(injectFn)          // pass webViewRef inject wrapper
//   HelmetMapStreamer.ingestFrame(base64Jpeg)  // call from onWebViewMessage
//   HelmetMapStreamer.stop()

import HelmetUDP from './HelmetUDP'

// Tuning
const TARGET_FPS      = 5
const DIFF_THRESHOLD  = 28
const DIFF_MIN_PIXELS = 150
const JPEG_QUALITY    = 0.65

// Singleton state
let _inject     = null
let _timer      = null
let _active     = false
let _prevPixels = null

const HelmetMapStreamer = {

  start(injectFn) {
    if (_active) return
    if (typeof injectFn !== 'function') {
      console.warn('[MapStreamer] start() needs an inject function')
      return
    }
    _inject     = injectFn
    _active     = true
    _prevPixels = null
    console.log('[MapStreamer] started')
    _scheduleNext()
  },

  stop() {
    _active = false
    if (_timer) { clearTimeout(_timer); _timer = null }
    _prevPixels = null
    _inject     = null
    console.log('[MapStreamer] stopped')
  },

  isActive() { return _active },

  async ingestFrame(base64) {
    if (!_active || !base64) return
    try {
      await _processFrame(base64)
    } catch (err) {
      console.warn('[MapStreamer] ingestFrame error:', err?.message)
    }
  },
}

export default HelmetMapStreamer

function _scheduleNext() {
  if (!_active) return
  _timer = setTimeout(_requestFrame, Math.round(1000 / TARGET_FPS))
}

function _requestFrame() {
  if (!_active || !_inject) return

  const quality = JPEG_QUALITY

  _inject(`
    (function() {
      try {
        var mapEl = document.getElementById('map');
        if (!mapEl) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }
        var out = document.createElement('canvas');
        out.width = 120; out.height = 120;
        var ctx = out.getContext('2d');
        ctx.fillStyle = '#e8e0d8';
        ctx.fillRect(0, 0, 120, 120);
        var rect = mapEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }
        var sx = 120 / rect.width;
        var sy = 120 / rect.height;
        var tiles = mapEl.querySelectorAll('.leaflet-tile');
        tiles.forEach(function(img) {
          try {
            var r = img.getBoundingClientRect();
            ctx.drawImage(img,
              (r.left - rect.left) * sx, (r.top - rect.top) * sy,
              r.width * sx, r.height * sy
            );
          } catch(e) {}
        });
        var overlays = mapEl.querySelectorAll('.leaflet-overlay-pane canvas');
        overlays.forEach(function(el) {
          try { ctx.drawImage(el, 0, 0, 120, 120); } catch(e) {}
        });
        if (typeof userLat !== 'undefined' && userLat !== null && typeof map !== 'undefined') {
          try {
            var pt = map.latLngToContainerPoint([userLat, userLng]);
            var px = (pt.x / rect.width) * 120;
            var py = (pt.y / rect.height) * 120;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#4F46E5';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.fill(); ctx.stroke();
          } catch(e) {}
        }
        var dataUrl = out.toDataURL('image/jpeg', ${quality});
        var b64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame', b64: b64}));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame', b64:null}));
      }
    })(); true;
  `)

  _scheduleNext()
}

async function _processFrame(base64) {
  const binary   = atob(base64)
  const jpegBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) jpegBytes[i] = binary.charCodeAt(i)

  let pixels
  try {
    const blob   = new Blob([jpegBytes], { type: 'image/jpeg' })
    const bitmap = await createImageBitmap(blob)
    const oc     = new OffscreenCanvas(120, 120)
    const ctx    = oc.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, 120, 120)
    pixels = ctx.getImageData(0, 0, 120, 120).data
  } catch (err) {
    // OffscreenCanvas not available — skip diff, always send
    HelmetUDP.sendJpeg(jpegBytes)
    return
  }

  const changed = _countChangedPixels(pixels)
  if (changed < DIFF_MIN_PIXELS) return

  _prevPixels = new Uint8Array(pixels)
  HelmetUDP.sendJpeg(jpegBytes)
}

function _countChangedPixels(newPixels) {
  if (!_prevPixels || _prevPixels.length !== newPixels.length) return Infinity
  let count = 0
  for (let i = 0; i < newPixels.length; i += 4) {
    if (
      Math.abs(newPixels[i]   - _prevPixels[i])   > DIFF_THRESHOLD ||
      Math.abs(newPixels[i+1] - _prevPixels[i+1]) > DIFF_THRESHOLD ||
      Math.abs(newPixels[i+2] - _prevPixels[i+2]) > DIFF_THRESHOLD
    ) count++
  }
  return count
}
// src/utils/HelmetMapStreamer.js
//
// Captures the navigation map by injecting a canvas snapshot request into
// the existing Leaflet WebView — no react-native-maps, no native modules,
// no CORS issues (tiles are already rendered in the page).
//
// How it works:
//   1. Every 125ms (8 fps) we inject a JS snippet into the WebView that
//      stitches all visible Leaflet tile <img> elements + the route canvas
//      into a 240x240 <canvas> and postMessages the result as a base64 JPEG.
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

// ─── Tuning ──────────────────────────────────────────────────────────────────
const TARGET_FPS      = 8      // 125ms interval — safe for WiFi UDP budget
const DIFF_THRESHOLD  = 25     // per-channel delta to count a pixel as changed
const DIFF_MIN_PIXELS = 100    // min changed pixels before we send a frame
const JPEG_QUALITY    = 0.72   // 0.0–1.0 — 0.72 is sharp but not heavy
const MAP_W           = 120    // must match SecondDisplay MAP_W
const MAP_H           = 120    // must match SecondDisplay MAP_H
// ─────────────────────────────────────────────────────────────────────────────

// Singleton state
let _inject     = null
let _timer      = null
let _active     = false
let _prevPixels = null
let _waiting    = false   // prevent pile-up if WebView is slow to respond

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
    _waiting    = false
    console.log('[MapStreamer] started')
    _scheduleNext()
  },

  stop() {
    _active  = false
    _waiting = false
    if (_timer) { clearTimeout(_timer); _timer = null }
    _prevPixels = null
    _inject     = null
    console.log('[MapStreamer] stopped')
  },

  isActive() { return _active },

  async ingestFrame(base64) {
    if (!_active || !base64) { _waiting = false; return }
    _waiting = false
    try {
      await _processFrame(base64)
    } catch (err) {
      console.warn('[MapStreamer] ingestFrame error:', err?.message)
    }
  },
}

export default HelmetMapStreamer

// ─────────────────────────────────────────────────────────────────────────────

function _scheduleNext() {
  if (!_active) return
  _timer = setTimeout(_requestFrame, Math.round(1000 / TARGET_FPS))
}

function _requestFrame() {
  if (!_active || !_inject) return

  // If the WebView hasn't replied yet, skip this tick to avoid pile-up
  if (_waiting) {
    _scheduleNext()
    return
  }

  _waiting = true
  const quality = JPEG_QUALITY
  const mapW    = MAP_W
  const mapH    = MAP_H

  // Safety timeout — unblock if WebView never replies (e.g. page reloading)
  setTimeout(() => { _waiting = false }, 1000)

  _inject(`
    (function() {
      try {
        var mapEl = document.getElementById('map');
        if (!mapEl) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }

        var out = document.createElement('canvas');
        out.width  = ${mapW};
        out.height = ${mapH};
        var ctx = out.getContext('2d');

        ctx.fillStyle = '#e8e0d8';
        ctx.fillRect(0, 0, ${mapW}, ${mapH});

        var rect = mapEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }

        var sx = ${mapW} / rect.width;
        var sy = ${mapH} / rect.height;

        // Draw all Leaflet tile images
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

        // Draw route line canvas overlays
        var overlays = mapEl.querySelectorAll('.leaflet-overlay-pane canvas');
        overlays.forEach(function(el) {
          try { ctx.drawImage(el, 0, 0, ${mapW}, ${mapH}); } catch(e) {}
        });

        // Draw SVG overlays (route polyline drawn by Leaflet as SVG)
        var svgOverlays = mapEl.querySelectorAll('.leaflet-overlay-pane svg');
        svgOverlays.forEach(function(svgEl) {
          try {
            var s = new XMLSerializer().serializeToString(svgEl);
            var blob = new Blob([s], {type:'image/svg+xml'});
            var url  = URL.createObjectURL(blob);
            var img  = new Image();
            img.onload = function() {
              ctx.drawImage(img, 0, 0, ${mapW}, ${mapH});
              URL.revokeObjectURL(url);
            };
            img.src = url;
          } catch(e) {}
        });

        // Draw user position dot
        if (typeof userLat !== 'undefined' && userLat !== null && typeof map !== 'undefined') {
          try {
            var pt = map.latLngToContainerPoint([userLat, userLng]);
            var px = (pt.x / rect.width)  * ${mapW};
            var py = (pt.y / rect.height) * ${mapH};

            // Accuracy ring
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
            ctx.fill();

            // Position dot
            ctx.beginPath();
            ctx.arc(px, py, 7, 0, Math.PI * 2);
            ctx.fillStyle   = '#4F46E5';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth   = 2.5;
            ctx.fill();
            ctx.stroke();
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
  const binary    = atob(base64)
  const jpegBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) jpegBytes[i] = binary.charCodeAt(i)

  let pixels
  try {
    const blob   = new Blob([jpegBytes], { type: 'image/jpeg' })
    const bitmap = await createImageBitmap(blob)
    const oc     = new OffscreenCanvas(MAP_W, MAP_H)
    const ctx    = oc.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, MAP_W, MAP_H)
    pixels = ctx.getImageData(0, 0, MAP_W, MAP_H).data
  } catch (err) {
    // OffscreenCanvas not available — skip diff, always send
    console.log('[MapStreamer] no OffscreenCanvas, sending raw frame')
    HelmetUDP.sendJpeg(jpegBytes)
    return
  }

  const changed = _countChangedPixels(pixels)
  console.log(`[MapStreamer] changed pixels: ${changed} / ${MAP_W * MAP_H}`)

  if (changed < DIFF_MIN_PIXELS) return

  _prevPixels = new Uint8Array(pixels)
  console.log(`[MapStreamer] sent frame ${jpegBytes.length}B`)
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
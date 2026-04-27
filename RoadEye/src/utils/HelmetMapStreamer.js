// src/utils/HelmetMapStreamer.js

import HelmetUDP from './HelmetUDP'

// ─── Tuning ──────────────────────────────────────────────────────────────────
const TARGET_FPS      = 5
const DIFF_THRESHOLD  = 20
const DIFF_MIN_PIXELS = 80
const JPEG_QUALITY    = 0.92
const MAP_W           = 120
const MAP_H           = 120
// ─────────────────────────────────────────────────────────────────────────────

let _inject     = null
let _timer      = null
let _active     = false
let _paused     = false
let _prevB64    = null   // ← store previous base64 for string-level diff
let _waiting    = false

const HelmetMapStreamer = {

  start(injectFn) {
    if (_active) return
    if (typeof injectFn !== 'function') {
      console.warn('[MapStreamer] start() needs an inject function')
      return
    }
    _inject  = injectFn
    _active  = true
    _paused  = false
    _prevB64 = null
    _waiting = false
    console.log('[MapStreamer] started')
    _scheduleNext()
  },

  pause() {
    if (!_active) return
    _paused = true
    console.log('[MapStreamer] paused')
  },

  resume(injectFn) {
    if (!_active) return
    if (typeof injectFn === 'function') _inject = injectFn
    _paused  = false
    _waiting = false
    console.log('[MapStreamer] resumed')
  },

  updateInject(injectFn) {
    if (typeof injectFn === 'function') {
      _inject  = injectFn
      _paused  = false
      _waiting = false
      console.log('[MapStreamer] inject reference updated')
    }
  },

  stop() {
    _active  = false
    _paused  = false
    _waiting = false
    if (_timer) { clearTimeout(_timer); _timer = null }
    _prevB64 = null
    _inject  = null
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
  if (!_active) return
  if (_paused || !_inject) { _scheduleNext(); return }
  if (_waiting)             { _scheduleNext(); return }

  _waiting = true
  setTimeout(() => { _waiting = false }, 1500)

  _inject(`
    (function() {
      try {
        var mapEl = document.getElementById('map');
        if (!mapEl) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }

        var out = document.createElement('canvas');
        out.width  = ${MAP_W};
        out.height = ${MAP_H};
        var ctx = out.getContext('2d');

        var rect = mapEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }

        var sx = ${MAP_W} / rect.width;
        var sy = ${MAP_H} / rect.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, ${MAP_W}, ${MAP_H});

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

        var svgOverlays = mapEl.querySelectorAll('.leaflet-overlay-pane svg');
        svgOverlays.forEach(function(svgEl) {
          try {
            var svgW = parseFloat(svgEl.getAttribute('width'))  || svgEl.getBoundingClientRect().width;
            var svgH = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
            var svgR = svgEl.getBoundingClientRect();

            var ox = (svgR.left - rect.left) * sx;
            var oy = (svgR.top  - rect.top)  * sy;
            var kx = (${MAP_W} / rect.width)  * (svgR.width  / svgW);
            var ky = (${MAP_H} / rect.height) * (svgR.height / svgH);

            var paths = svgEl.querySelectorAll('path');
            paths.forEach(function(pathEl) {
              var d = pathEl.getAttribute('d');
              if (!d || d.length < 4) return;
              var fill = pathEl.getAttribute('fill') || '';
              if (fill && fill !== 'none') return;
              try {
                var p2d = new Path2D(d);
                ctx.save();
                ctx.translate(ox, oy);
                ctx.scale(kx, ky);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth   = 4 / Math.min(kx, ky);
                ctx.lineCap     = 'round';
                ctx.lineJoin    = 'round';
                ctx.globalAlpha = 1.0;
                ctx.stroke(p2d);
                ctx.restore();
              } catch(pe) {}
            });
          } catch(e) {}
        });

        var canvasOverlays = mapEl.querySelectorAll('.leaflet-overlay-pane canvas');
        canvasOverlays.forEach(function(el) {
          try {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(el, 0, 0, ${MAP_W}, ${MAP_H});
            ctx.restore();
          } catch(e) {}
        });

        if (typeof userLat !== 'undefined' && userLat !== null && typeof map !== 'undefined') {
          try {
            var pt = map.latLngToContainerPoint([userLat, userLng]);
            var px = (pt.x / rect.width)  * ${MAP_W};
            var py = (pt.y / rect.height) * ${MAP_H};

            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 200, 0.35)';
            ctx.lineWidth   = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle   = '#00ffc8';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth   = 1.5;
            ctx.fill();
            ctx.stroke();
          } catch(e) {}
        }

        var dataUrl = out.toDataURL('image/jpeg', ${JPEG_QUALITY});
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
  // Convert base64 → raw JPEG bytes
  const binary    = atob(base64)
  const jpegBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) jpegBytes[i] = binary.charCodeAt(i)

  // ── Diff check ────────────────────────────────────────────────────────────
  // OffscreenCanvas is not available in React Native, so we diff the base64
  // string directly. This is not pixel-perfect but catches identical frames
  // (user stopped, map hasn't panned) and skips them cheaply.
  if (_prevB64 !== null) {
    const changed = _b64ChangedRatio(base64, _prevB64)
    console.log(`[MapStreamer] frame diff ratio: ${(changed * 100).toFixed(1)}%`)

    // DIFF_MIN_PIXELS / total pixels converted to a ratio threshold
    const threshold = DIFF_MIN_PIXELS / (MAP_W * MAP_H)
    if (changed < threshold) {
      console.log('[MapStreamer] frame unchanged — skipped')
      return
    }
  }

  _prevB64 = base64
  console.log(`[MapStreamer] sending frame ${jpegBytes.length}B`)
  HelmetUDP.sendJpeg(jpegBytes)
}

// ─── Fast base64 string diff ──────────────────────────────────────────────────
// Samples every 4th base64 character (each char = 6 bits ≈ covers ~3 pixels
// per 4-char group). Returns fraction of sampled chars that differ (0.0–1.0).
function _b64ChangedRatio(a, b) {
  if (a.length !== b.length) return 1.0   // different size = definitely changed
  let diff  = 0
  let total = 0
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i]) diff++
    total++
  }
  return total === 0 ? 1.0 : diff / total
}
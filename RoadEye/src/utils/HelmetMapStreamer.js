// src/utils/HelmetMapStreamer.js

import HelmetUDP from './HelmetUDP'

// ─── Tuning ──────────────────────────────────────────────────────────────────
const TARGET_FPS      = 5      // 200ms interval — gives JPEGDEC time to decode
const DIFF_THRESHOLD  = 20     // per-channel delta to count a pixel as changed
const DIFF_MIN_PIXELS = 80     // min changed pixels before sending a frame
const JPEG_QUALITY    = 0.92   // near-lossless — eliminate blocking artifacts
const MAP_W           = 120    // must match SecondDisplay MAP_W
const MAP_H           = 120    // must match SecondDisplay MAP_H
// ─────────────────────────────────────────────────────────────────────────────

let _inject     = null
let _timer      = null
let _active     = false
let _paused     = false
let _prevPixels = null
let _waiting    = false

const HelmetMapStreamer = {

  start(injectFn) {
    if (_active) return
    if (typeof injectFn !== 'function') {
      console.warn('[MapStreamer] start() needs an inject function')
      return
    }
    _inject     = injectFn
    _active     = true
    _paused     = false
    _prevPixels = null
    _waiting    = false
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
  if (!_active) return
  if (_paused || !_inject) { _scheduleNext(); return }
  if (_waiting)             { _scheduleNext(); return }

  _waiting = true
  const quality = JPEG_QUALITY
  const mapW    = MAP_W
  const mapH    = MAP_H

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
        out.width  = ${mapW};
        out.height = ${mapH};
        var ctx = out.getContext('2d');

        var rect = mapEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'__mapFrame',b64:null}));
          return;
        }

        var sx = ${mapW} / rect.width;
        var sy = ${mapH} / rect.height;

        // ── 1. Black background ───────────────────────────────────────────
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, ${mapW}, ${mapH});

        // ── 2. Dark map tiles at full opacity ─────────────────────────────
        // CartoCDN dark_all tiles already have black background + grey roads
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

        // ── 3. Route line — drawn SYNCHRONOUSLY from SVG path data ───────
        // The async blob/Image approach misses the frame because toDataURL()
        // runs before img.onload fires. Instead we read the SVG <path>
        // elements directly and replay them onto the canvas with Path2D.
        var svgOverlays = mapEl.querySelectorAll('.leaflet-overlay-pane svg');
        svgOverlays.forEach(function(svgEl) {
          try {
            var svgW = parseFloat(svgEl.getAttribute('width'))  || svgEl.getBoundingClientRect().width;
            var svgH = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
            var svgR = svgEl.getBoundingClientRect();

            // Offset of SVG origin relative to map div, scaled to canvas px
            var ox = (svgR.left - rect.left) * sx;
            var oy = (svgR.top  - rect.top)  * sy;

            // How much to scale SVG internal coords to canvas coords
            var kx = (${mapW} / rect.width)  * (svgR.width  / svgW);
            var ky = (${mapH} / rect.height) * (svgR.height / svgH);

            var paths = svgEl.querySelectorAll('path');
            paths.forEach(function(pathEl) {
              var d = pathEl.getAttribute('d');
              if (!d || d.length < 4) return;

              // Skip filled shapes (destination pin circles etc.)
              var fill = pathEl.getAttribute('fill') || '';
              if (fill && fill !== 'none') return;

              try {
                var p2d = new Path2D(d);
                ctx.save();
                ctx.translate(ox, oy);
                ctx.scale(kx, ky);
                // White route line, thick enough to be visible at 120px
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

        // Fallback: canvas renderer (some Leaflet configs use this)
        var canvasOverlays = mapEl.querySelectorAll('.leaflet-overlay-pane canvas');
        canvasOverlays.forEach(function(el) {
          try {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(el, 0, 0, ${mapW}, ${mapH});
            ctx.restore();
          } catch(e) {}
        });

        // ── 4. User position dot — bright cyan ────────────────────────────
        if (typeof userLat !== 'undefined' && userLat !== null && typeof map !== 'undefined') {
          try {
            var pt = map.latLngToContainerPoint([userLat, userLng]);
            var px = (pt.x / rect.width)  * ${mapW};
            var py = (pt.y / rect.height) * ${mapH};

            // Glow ring
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 200, 0.35)';
            ctx.lineWidth   = 3;
            ctx.stroke();

            // Solid dot
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle   = '#00ffc8';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth   = 1.5;
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
    console.log('[MapStreamer] no OffscreenCanvas, sending raw frame')
    HelmetUDP.sendJpeg(jpegBytes)
    return
  }

  const changed = _countChangedPixels(pixels)
  console.log(`[MapStreamer] changed: ${changed} / ${MAP_W * MAP_H}`)
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
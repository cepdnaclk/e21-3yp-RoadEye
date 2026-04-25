// src/utils/PCLinkConstants.js
//
// Mirror of the PKT namespace in PCLink.h.
// Keep in sync with the C++ enum whenever you add new packet types.

export const PKT = Object.freeze({
  JPEG_CHUNK:  0x01,
  AUDIO:       0x02,
  TELEMETRY:   0x03,
  PING:        0x04,
  PONG:        0x05,
  SENSOR_OUT:  0x10,
  IMU_OUT:     0x11,
  WEAR_OUT:    0x12,
  // Reserve 0x20 onward for nav if you add PKT_NAV_STEP later
})

export const HEADER_LEN      = 6
export const MAX_CHUNK_PAYLOAD = 220    // must match PCLink.h

# PCLink — ESP32 ↔ PC Binary UDP Bridge

## Files

| File | Role |
|------|------|
| `PCLink.h` | Library header — packet types, structs, class declaration |
| `PCLink.cpp` | Library implementation |
| `main.cpp` | Your updated helmet firmware (drop-in replacement) |
| `pc_link.py` | PC-side Python counterpart for testing / integration |

Place `PCLink.h` and `PCLink.cpp` in the same folder as `main.cpp`
(or in a `lib/PCLink/` subfolder if you use PlatformIO).

---

## Binary Protocol

Every UDP datagram starts with a **6-byte header**:

```
Byte 0      type          uint8   PKT_* constant
Byte 1-2    frameId       uint16  rolling counter, little-endian
Byte 3      chunkIdx      uint8   0-based chunk index
Byte 4      totalChunks   uint8   total chunks in this frame
Byte 5      payloadLen    uint8   bytes that follow (0–250)
Bytes 6…    payload       N bytes
```

Max datagram = 256 bytes → safely below any real-world MTU.

### Packet types

| Constant | Value | Direction | Purpose |
|----------|-------|-----------|---------|
| `PKT_JPEG_CHUNK` | 0x01 | PC → ESP32 | Map image chunk |
| `PKT_AUDIO` | 0x02 | PC → ESP32 | PCM audio (8-bit, 8 kHz mono) |
| `PKT_TELEMETRY` | 0x03 | PC → ESP32 | Location + weather (31 B struct) |
| `PKT_SENSOR_OUT` | 0x04 | ESP32 → PC | BLE sensor readings (33 B struct) |
| `PKT_IMU_OUT` | 0x05 | ESP32 → PC | Raw IMU accel/gyro (24 B struct) |
| `PKT_WEAR_OUT` | 0x06 | ESP32 → PC | Wear state (1 B: 0=ACTIVE 1=IDLE 2=SLEEPING) |
| `PKT_PING` | 0x07 | both | Keepalive (0-byte payload) |
| `PKT_PONG` | 0x08 | both | Reply to ping |

---

## JPEG Map Streaming

- PC splits each JPEG into ≤ 250-byte chunks, sends all chunks with the same `frameId`.
- ESP32 reassembles in a 12 kB buffer; fires `onJpegFrame()` when all chunks arrive.
- A 5 kB JPEG (120×120, medium quality) needs ~21 chunks — well within uint8 range.
- Dropped frames are silently discarded; the next `frameId` starts fresh.

---

## Integration Steps

### 1. Edit WiFi credentials in `main.cpp`
```cpp
static const char* WIFI_SSID = "YOUR_SSID";
static const char* WIFI_PASS = "YOUR_PASSWORD";
```

### 2. Add `drawJpeg()` to SecondDisplay
The updated `main.cpp` calls `display2.drawJpeg(buf, len)`.
Add this method to `SecondDisplay` — exact implementation depends on your
TFT library, but typically:
```cpp
void SecondDisplay::drawJpeg(const uint8_t* buf, size_t len) {
    // e.g. TJpgDec.drawJpg(0, 0, buf, len);
    // or   jpegDraw(buf, len, 0, 0);
}
```

### 3. PlatformIO `platformio.ini` additions
```ini
lib_deps =
    ; existing deps …
    WiFi          ; built-in for ESP32, no entry needed
    ; no extra libs required — PCLink uses only Arduino core + WiFi
```

### 4. Run the PC script
```bash
# First boot — ESP32 learns PC IP from first packet it receives
python pc_link.py --esp 192.168.1.42

# Stream a map tile
python pc_link.py --esp 192.168.1.42 --jpeg map_tile.jpg
```

---

## Send Rates (defaults in main.cpp)

| Data | Rate | Approx bytes/s to PC |
|------|------|----------------------|
| Sensor (BLE) | 10 Hz | 330 B/s |
| IMU | 20 Hz | 480 B/s |
| Wear state | 10 Hz | 10 B/s |
| **Total outbound** | | **~820 B/s** |

| Data | Rate | Approx bytes/s from PC |
|------|------|------------------------|
| JPEG map | 5 fps × ~5 kB | ~25 kB/s |
| Audio | 8 kHz × 1 B | ~8 kB/s |
| Telemetry | 1 Hz | ~31 B/s |
| **Total inbound** | | **~33 kB/s** |

All well within 802.11n UDP throughput on a local network.

---

## Failure Modes

| Situation | Behaviour |
|-----------|-----------|
| WiFi not available at boot | `pclink.begin()` returns false; helmet runs normally without PC link |
| WiFi drops mid-ride | Auto-reconnect every 10 s; sends resume when reconnected |
| Packet loss on JPEG | Partial frame silently discarded; next frame starts clean |
| PC goes offline | Ping timer fires every 2 s; no crash — sends are no-ops until peer returns |
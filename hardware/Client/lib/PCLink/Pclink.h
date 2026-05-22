#pragma once
// ─────────────────────────────────────────────────────────────────────────────
//  PCLink.h
//  WiFi-UDP bridge between the helmet ESP32 and a PC.
//
//  RECEIVE from PC (→ display/audio on helmet):
//    • JPEG map frames  (120×120, up to 5 fps, multi-chunk reassembly)
//    • PCM audio        (8-bit unsigned, 8 kHz mono, single-chunk)
//    • Telemetry        (location, weather, speed — binary struct)
//
//  SEND to PC (← sensor readings from helmet):
//    • SensorData struct (BLE readings forwarded from SensorBLEClient)
//    • ImuData struct    (raw accel/gyro)
//    • WearState enum    (ACTIVE / IDLE / SLEEPING)
//
//  Binary packet header — 6 bytes, no JSON overhead:
//    [0]   type        uint8   PKT_* constant
//    [1-2] frameId     uint16  rolling frame counter (little-endian)
//    [3]   chunkIdx    uint8   0-based chunk index within this frame
//    [4]   totalChunks uint8   total chunks in this frame
//    [5]   payloadLen  uint8   bytes that follow (0-250)
//    [6…]  payload     N bytes
//
//  Max UDP payload  = HEADER_LEN + MAX_CHUNK_PAYLOAD  = 6 + 250 = 256 bytes.
//  Kept small so it fits in a single UDP datagram on any network MTU.
//  A 10 kB JPEG at 250 B/chunk needs ≤ 41 chunks → well within uint8.
// ─────────────────────────────────────────────────────────────────────────────

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUDP.h>

// ── Forward declarations for types used in callbacks ─────────────────────────
struct SensorData;   // defined in SensorBLEClient.h
struct ImuData;      // defined in MPU6050.h

// ── Packet type constants ─────────────────────────────────────────────────────
namespace PKT {
  constexpr uint8_t JPEG_CHUNK  = 0x01; // PC → ESP32 : map image chunk
  constexpr uint8_t AUDIO       = 0x02; // PC → ESP32 : PCM audio chunk
  constexpr uint8_t TELEMETRY   = 0x03; // PC → ESP32 : location/weather/speed
  constexpr uint8_t SENSOR_OUT  = 0x04; // ESP32 → PC : BLE sensor readings
  constexpr uint8_t IMU_OUT     = 0x05; // ESP32 → PC : raw IMU data
  constexpr uint8_t WEAR_OUT    = 0x06; // ESP32 → PC : wear state
  constexpr uint8_t PING        = 0x07; // bidirectional keepalive
  constexpr uint8_t PONG        = 0x08; // reply to ping
}

// ── Header layout ─────────────────────────────────────────────────────────────
constexpr size_t   HEADER_LEN       = 6;
constexpr size_t   MAX_CHUNK_PAYLOAD = 250;
constexpr size_t   MAX_UDP_PKT      = HEADER_LEN + MAX_CHUNK_PAYLOAD;

// ── Telemetry struct (PC → ESP32, packed) ────────────────────────────────────
// Total: 4+4+4+4+4+4+4+2+1 = 31 bytes
#pragma pack(push, 1)
struct TelemetryPacket {
  float   lat;          // GPS latitude  (degrees)
  float   lng;          // GPS longitude (degrees)
  float   speed;        // km/h
  float   heading;      // degrees 0-360
  float   tempC;        // air temperature °C
  float   humidity;     // %
  float   pressure;     // hPa
  int16_t altitudeM;    // metres
  uint8_t weatherIcon;  // 0=clear 1=cloud 2=rain 3=snow 4=fog 5=storm
};
#pragma pack(pop)

// ── SensorOut struct (ESP32 → PC, packed) ────────────────────────────────────
// Mirrors the fields from SensorData that are worth sending over the air.
// Total: 4+4+4+4+4+4+4+4+1 = 33 bytes
#pragma pack(push, 1)
struct SensorOutPacket {
  float   distLeft;      // cm
  float   distRight;     // cm
  float   distRear;      // cm
  float   forwardAccel;  // g
  float   roll;          // degrees
  float   temperature;   // °C
  float   humidity;      // %
  float   vibration;
  uint8_t isRiding;      // 0 or 1
};
#pragma pack(pop)

// ── ImuOut struct (ESP32 → PC, packed) ───────────────────────────────────────
// Total: 4+4+4+4+4+4 = 24 bytes
#pragma pack(push, 1)
struct ImuOutPacket {
  float accelX;   // g
  float accelY;
  float accelZ;
  float gyroX;    // deg/s
  float gyroY;
  float gyroZ;
};
#pragma pack(pop)

// ── Reassembly buffer for incoming JPEG frames ────────────────────────────────
constexpr size_t MAX_JPEG_FRAME_BYTES = 12000;  // 120×120 JPEG rarely > 8 kB

struct JpegReassembler {
  uint8_t  buf[MAX_JPEG_FRAME_BYTES];
  size_t   written      = 0;
  uint16_t frameId      = 0xFFFF;
  uint8_t  chunksGot    = 0;
  uint8_t  chunksNeeded = 0;

  // Returns true if this chunk completed the frame
  bool ingest(uint16_t fid, uint8_t idx, uint8_t total,
              const uint8_t* data, uint8_t len);
  void reset();
};

// ── Callback types ────────────────────────────────────────────────────────────
using JpegFrameCb    = void(*)(const uint8_t* jpeg, size_t len);
using AudioChunkCb   = void(*)(const uint8_t* pcm,  size_t len);
using TelemetryCb    = void(*)(const TelemetryPacket& t);

// ═════════════════════════════════════════════════════════════════════════════
//  PCLink class
// ═════════════════════════════════════════════════════════════════════════════

class PCLink {
public:
  // ── Construction ──────────────────────────────────────────────────────────
  PCLink() = default;

  // ── Configuration (call before begin) ────────────────────────────────────
  void setWiFi(const char* ssid, const char* password);
  void setPort(uint16_t listenPort, uint16_t sendPort = 0);
  // sendPort defaults to listenPort if left 0

  // ── Callbacks — register before begin() ──────────────────────────────────
  void onJpegFrame  (JpegFrameCb  cb) { _jpegCb    = cb; }
  void onAudioChunk (AudioChunkCb cb) { _audioCb   = cb; }
  void onTelemetry  (TelemetryCb  cb) { _telemCb   = cb; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  // begin() connects WiFi, starts UDP. Blocks up to timeoutMs for WiFi.
  // Returns true on success, false on WiFi timeout.
  bool begin(uint32_t timeoutMs = 600000);

  // loop() must be called every iteration of Arduino loop().
  // Drains the UDP receive buffer and processes all waiting packets.
  void loop();

  // ── Send helpers ──────────────────────────────────────────────────────────
  // Call these from your loop when you have fresh data.
  // They are no-ops if WiFi / UDP is not ready, or if pcIP is unknown.

  void sendSensorData(const SensorOutPacket& s);
  void sendImuData   (const ImuOutPacket&    i);
  void sendWearState (uint8_t state);   // 0=ACTIVE 1=IDLE 2=SLEEPING
  void sendPing();

  // ── Status ────────────────────────────────────────────────────────────────
  bool      isConnected()  const { return WiFi.status() == WL_CONNECTED; }
  IPAddress localIP()      const { return WiFi.localIP(); }
  IPAddress pcIP()         const { return _pcIP; }
  uint32_t  lastRxMs()     const { return _lastRx; }
  bool      hasPeerIP()    const { return (uint32_t)_pcIP != 0; }

private:
  // WiFi / UDP
  const char* _ssid     = nullptr;
  const char* _password = nullptr;
  uint16_t    _rxPort   = 4210;
  uint16_t    _txPort   = 4210;
  WiFiUDP     _udp;
  IPAddress   _pcIP;            // learned from first incoming packet

  // Callbacks
  JpegFrameCb  _jpegCb  = nullptr;
  AudioChunkCb _audioCb = nullptr;
  TelemetryCb  _telemCb = nullptr;

  // State
  uint16_t  _txFrameId  = 0;
  uint32_t  _lastRx     = 0;
  uint32_t  _lastPing   = 0;

  // Reassembly
  JpegReassembler _jpeg;

  // Internal helpers
  void     _processPacket(const uint8_t* buf, size_t len, IPAddress sender);
  void     _sendRaw(const uint8_t* pkt, size_t len);
  size_t   _buildHeader(uint8_t* out, uint8_t type, uint16_t frameId,
                        uint8_t chunkIdx, uint8_t totalChunks, uint8_t payloadLen);
  void     _sendSmall(uint8_t type, const uint8_t* payload, uint8_t payloadLen);

  uint8_t  _rxBuf[MAX_UDP_PKT + 4];  // +4 guard bytes
  uint8_t  _txBuf[MAX_UDP_PKT + 4];
};
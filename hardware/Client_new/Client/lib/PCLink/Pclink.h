#pragma once
// ─────────────────────────────────────────────────────────────────────────────
//  PCLink.h
//  WiFi-UDP bridge between the helmet ESP32 and a PC / phone.
//
//  RECEIVE from PC (→ display/audio on helmet):
//    • JPEG map frames  (120×120, up to 5 fps, multi-chunk reassembly)
//    • PCM audio        (8-bit unsigned, 22050 Hz mono, single-chunk)
//    • Navigation       (speed, distance, completion %, start/dest weather)
//    • Media            (song name, author, progress %)
//    • DateTime         (current date and time)
//    • Weather          (local temp, humidity, weather icon)
//
//  SEND to PC (← sensor readings from helmet):
//    • SensorData struct (BLE readings forwarded from SensorBLEClient)
//    • ImuData struct    (raw accel/gyro)
//    • WearState enum    (ACTIVE / IDLE / SLEEPING)
//
//  DISCOVERY:
//    • Broadcasts "ROADEYE:<ip>" on UDP port 4211 every 3 seconds so the
//      phone can auto-discover the ESP32 without needing a fixed IP.
//      Port is configurable via setDiscoveryPort() before begin().
//      mDNS is attempted but discovery beacon works even if mDNS fails.
//
//  Binary packet header — 6 bytes, no JSON overhead:
//    [0]   type        uint8   PKT_* constant
//    [1-2] frameId     uint16  rolling frame counter (little-endian)
//    [3]   chunkIdx    uint8   0-based chunk index within this frame
//    [4]   totalChunks uint8   total chunks in this frame
//    [5]   payloadLen  uint8   bytes that follow (0-220)
//    [6…]  payload     N bytes
//
//  Max UDP payload  = HEADER_LEN + MAX_CHUNK_PAYLOAD  = 6 + 220 = 226 bytes.
//
//  Weather icon values (used in WeatherPacket, NavigationPacket):
//    1 = sunny
//    2 = cloudy
//    3 = rain
// ─────────────────────────────────────────────────────────────────────────────

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUDP.h>
#include <ESPmDNS.h>

// ── Forward declarations ──────────────────────────────────────────────────────
struct SensorData;
struct ImuData;

// ── Packet type constants ─────────────────────────────────────────────────────
namespace PKT {
  constexpr uint8_t JPEG_CHUNK  = 0x01; // PC → ESP32 : map image chunk
  constexpr uint8_t AUDIO       = 0x02; // PC → ESP32 : PCM audio chunk
  constexpr uint8_t NAVIGATION  = 0x03; // PC → ESP32 : navigation data
  constexpr uint8_t MEDIA       = 0x04; // PC → ESP32 : media / now playing
  constexpr uint8_t DATETIME    = 0x05; // PC → ESP32 : current date and time
  constexpr uint8_t WEATHER     = 0x06; // PC → ESP32 : local weather
  constexpr uint8_t SENSOR_OUT  = 0x10; // ESP32 → PC : BLE sensor readings
  constexpr uint8_t IMU_OUT     = 0x11; // ESP32 → PC : raw IMU data
  constexpr uint8_t WEAR_OUT    = 0x12; // ESP32 → PC : wear state
  constexpr uint8_t PING        = 0x07; // bidirectional keepalive
  constexpr uint8_t PONG        = 0x08; // reply to ping
}

// ── Header / payload sizes ────────────────────────────────────────────────────
constexpr size_t HEADER_LEN        = 6;
constexpr size_t MAX_CHUNK_PAYLOAD = 220;   // reduced from 250 — saves heap
constexpr size_t MAX_UDP_PKT       = HEADER_LEN + MAX_CHUNK_PAYLOAD;

// ── Weather icon values ───────────────────────────────────────────────────────
namespace WeatherIcon {
  constexpr uint8_t SUNNY  = 1;
  constexpr uint8_t CLOUDY = 2;
  constexpr uint8_t RAIN   = 3;
}

// ─────────────────────────────────────────────────────────────────────────────
//  INBOUND PACKETS  (PC → ESP32)
// ─────────────────────────────────────────────────────────────────────────────

#pragma pack(push, 1)
struct NavigationPacket {
  float   speed;          // km/h
  float   distRemaining;  // km
  float   completionPct;  // 0.0–100.0
  uint8_t startWeather;   // WeatherIcon
  uint8_t destWeather;    // WeatherIcon
};
#pragma pack(pop)

struct MediaPacket {
  float progressPct;
  char  songName[64];
  char  author[48];

  bool decode(const uint8_t* payload, uint8_t len) {
    if (len < 5) return false;
    memcpy(&progressPct, payload, 4);
    const char* p   = (const char*)(payload + 4);
    const char* end = (const char*)(payload + len);
    size_t sLen = strnlen(p, end - p);
    if (sLen >= sizeof(songName)) return false;
    memcpy(songName, p, sLen); songName[sLen] = '\0';
    p += sLen + 1;
    if (p >= end) return false;
    size_t aLen = strnlen(p, end - p);
    if (aLen >= sizeof(author)) return false;
    memcpy(author, p, aLen); author[aLen] = '\0';
    return true;
  }
};

#pragma pack(push, 1)
struct DateTimePacket {
  uint16_t year;
  uint8_t  month;
  uint8_t  day;
  uint8_t  hour;
  uint8_t  minute;
  uint8_t  second;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct WeatherPacket {
  float   tempC;
  float   humidity;
  uint8_t weatherIcon;
};
#pragma pack(pop)

// ─────────────────────────────────────────────────────────────────────────────
//  OUTBOUND PACKETS  (ESP32 → PC)
// ─────────────────────────────────────────────────────────────────────────────

#pragma pack(push, 1)
struct SensorOutPacket {
  float   distLeft;
  float   distRight;
  float   distRear;
  float   forwardAccel;
  float   roll;
  float   temperature;
  float   humidity;
  float   vibration;
  uint8_t isRiding;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct ImuOutPacket {
  float accelX;
  float accelY;
  float accelZ;
  float gyroX;
  float gyroY;
  float gyroZ;
};
#pragma pack(pop)

// ─────────────────────────────────────────────────────────────────────────────
//  JPEG REASSEMBLER
//  Reduced buffer from 12000 → 8000 bytes to free heap for UDP sockets.
// ─────────────────────────────────────────────────────────────────────────────
constexpr size_t MAX_JPEG_FRAME_BYTES = 8000;  // 120×120 JPEG rarely > 6 kB

struct JpegReassembler {
  uint8_t  buf[MAX_JPEG_FRAME_BYTES];
  size_t   written      = 0;
  uint16_t frameId      = 0xFFFF;
  uint8_t  chunksGot    = 0;
  uint8_t  chunksNeeded = 0;

  bool ingest(uint16_t fid, uint8_t idx, uint8_t total,
              const uint8_t* data, uint8_t len);
  void reset();
};

// ── Callback types ────────────────────────────────────────────────────────────
using JpegFrameCb    = void(*)(const uint8_t* jpeg, size_t len);
using AudioChunkCb   = void(*)(const uint8_t* pcm,  size_t len);
using NavigationCb   = void(*)(const NavigationPacket& n);
using MediaCb        = void(*)(const MediaPacket& m);
using DateTimeCb     = void(*)(const DateTimePacket& dt);
using WeatherCb      = void(*)(const WeatherPacket& w);

// ═════════════════════════════════════════════════════════════════════════════
//  PCLink class
// ═════════════════════════════════════════════════════════════════════════════

class PCLink {
public:
  PCLink() = default;

  // ── Configuration (call before begin()) ──────────────────────────────────
  void setWiFi(const char* ssid, const char* password);
  void setPort(uint16_t listenPort, uint16_t sendPort = 0);
  void setHostname(const char* hostname) { _hostname = hostname; }
  void setDiscoveryPort(uint16_t port)   { _discPort = port; }

  // ── Callbacks ─────────────────────────────────────────────────────────────
  void onJpegFrame  (JpegFrameCb  cb) { _jpegCb    = cb; }
  void onAudioChunk (AudioChunkCb cb) { _audioCb   = cb; }
  void onNavigation (NavigationCb cb) { _navCb     = cb; }
  void onMedia      (MediaCb      cb) { _mediaCb   = cb; }
  void onDateTime   (DateTimeCb   cb) { _dtCb      = cb; }
  void onWeather    (WeatherCb    cb) { _weatherCb = cb; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  bool begin(uint32_t timeoutMs = 600000);
  void loop();

  // ── Send helpers ──────────────────────────────────────────────────────────
  void sendSensorData(const SensorOutPacket& s);
  void sendImuData   (const ImuOutPacket&    i);
  void sendWearState (uint8_t state);
  void sendPing();

  // ── Status ────────────────────────────────────────────────────────────────
  bool      isConnected() const { return WiFi.status() == WL_CONNECTED; }
  IPAddress localIP()     const { return WiFi.localIP(); }
  IPAddress pcIP()        const { return _pcIP; }
  uint32_t  lastRxMs()    const { return _lastRx; }
  bool      hasPeerIP()   const { return (uint32_t)_pcIP != 0; }

private:
  const char* _ssid     = nullptr;
  const char* _password = nullptr;
  const char* _hostname = "roadeye";
  uint16_t    _rxPort   = 4210;
  uint16_t    _txPort   = 4210;
  WiFiUDP     _udp;
  IPAddress   _pcIP;

  // Discovery
  WiFiUDP  _discUdp;
  uint16_t _discPort      = 4211;
  uint32_t _lastBcast     = 0;
  bool     _discUdpReady  = false;   // tracks whether socket opened OK
  static constexpr uint32_t BCAST_INTERVAL = 3000;

  // Callbacks
  JpegFrameCb  _jpegCb    = nullptr;
  AudioChunkCb _audioCb   = nullptr;
  NavigationCb _navCb     = nullptr;
  MediaCb      _mediaCb   = nullptr;
  DateTimeCb   _dtCb      = nullptr;
  WeatherCb    _weatherCb = nullptr;

  // State
  uint16_t _txFrameId = 0;
  uint32_t _lastRx    = 0;
  uint32_t _lastPing  = 0;

  JpegReassembler _jpeg;

  void   _processPacket(const uint8_t* buf, size_t len, IPAddress sender);
  size_t _buildHeader(uint8_t* out, uint8_t type, uint16_t frameId,
                      uint8_t chunkIdx, uint8_t totalChunks, uint8_t payloadLen);
  void   _sendSmall(uint8_t type, const uint8_t* payload, uint8_t payloadLen);
  bool   _openDiscoverySocket();   // helper — opens _discUdp with retry

  uint8_t _rxBuf[MAX_UDP_PKT + 4];
  uint8_t _txBuf[MAX_UDP_PKT + 4];
};

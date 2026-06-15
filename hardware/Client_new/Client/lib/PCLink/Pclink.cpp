// ─────────────────────────────────────────────────────────────────────────────
//  PCLink.cpp
// ─────────────────────────────────────────────────────────────────────────────

#include "PCLink.h"

// ═════════════════════════════════════════════════════════════════════════════
//  JpegReassembler
// ═════════════════════════════════════════════════════════════════════════════

void JpegReassembler::reset() {
  written      = 0;
  frameId      = 0xFFFF;
  chunksGot    = 0;
  chunksNeeded = 0;
}

bool JpegReassembler::ingest(uint16_t fid, uint8_t idx, uint8_t total,
                              const uint8_t* data, uint8_t len) {
  if (fid != frameId) {
    reset();
    frameId      = fid;
    chunksNeeded = total;
  }
  if (total != chunksNeeded) { reset(); return false; }

  size_t offset = (size_t)idx * MAX_CHUNK_PAYLOAD;
  if (offset + len > MAX_JPEG_FRAME_BYTES) {
    Serial.println("[PCLink] JPEG buffer overflow — dropping frame");
    reset();
    return false;
  }

  memcpy(buf + offset, data, len);
  written = max(written, offset + len);
  chunksGot++;
  return (chunksGot == chunksNeeded);
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — configuration
// ═════════════════════════════════════════════════════════════════════════════

void PCLink::setWiFi(const char* ssid, const char* password) {
  _ssid     = ssid;
  _password = password;
}

void PCLink::setPort(uint16_t listenPort, uint16_t sendPort) {
  _rxPort = listenPort;
  _txPort = (sendPort == 0) ? listenPort : sendPort;
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — _openDiscoverySocket()
// ═════════════════════════════════════════════════════════════════════════════

bool PCLink::_openDiscoverySocket() {
  for (int attempt = 1; attempt <= 3; attempt++) {
    Serial.print("[UDP ] Discovery socket attempt ");
    Serial.print(attempt);
    Serial.print("/3 — free heap: ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" B");

    if (_discUdp.begin(_discPort)) {
      Serial.print("[UDP ] Discovery on : ");
      Serial.print(_discPort);
      Serial.println(" ✓");
      return true;
    }

    Serial.println("[UDP ] Discovery socket failed — waiting 300 ms");
    _discUdp.stop();
    delay(300);
  }

  Serial.println("[UDP ] Discovery socket FAILED after 3 attempts.");
  Serial.println("[UDP ] Beacon disabled — use manual IP entry.");
  return false;
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — begin()
// ═════════════════════════════════════════════════════════════════════════════

bool PCLink::begin(uint32_t timeoutMs) {
  Serial.println();
  Serial.println("=========== ESP32 NETWORK ===========");

  if (!_ssid) {
    Serial.println("[WiFi] ERROR       : setWiFi() not called");
    Serial.println("=====================================\n");
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(_ssid, _password);

  Serial.print("[WiFi] SSID         : ");
  Serial.println(_ssid);
  Serial.println("[WiFi] Status       : Connecting...");

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    if (millis() - t0 > timeoutMs) {
      Serial.println("[WiFi] Status       : FAILED (timeout)");
      Serial.println("=====================================\n");
      return false;
    }
  }

  Serial.println("[WiFi] Status       : Connected");
  Serial.print  ("[WiFi] IP Address   : ");
  Serial.println(WiFi.localIP());
  Serial.print  ("[WiFi] Signal (RSSI): ");
  Serial.print  (WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print  ("[Heap] Free after WiFi: ");
  Serial.print  (ESP.getFreeHeap());
  Serial.println(" B");

  {
    uint32_t ts = millis();
    while ((uint32_t)WiFi.localIP() == 0) {
      delay(50);
      if (millis() - ts > 3000) {
        Serial.println("[mDNS] WARNING      : IP stack slow");
        break;
      }
    }
    delay(150);
  }

  if (MDNS.begin(_hostname)) {
    Serial.print  ("[mDNS] Hostname     : ");
    Serial.print  (_hostname);
    Serial.println(".local");
    MDNS.addService("roadeye", "udp", _rxPort);
  } else {
    Serial.println("[mDNS] FAILED       : mDNS unavailable (low heap or stack issue)");
    Serial.println("[mDNS] NOTE         : UDP discovery beacon still active");
    MDNS.end();
    delay(100);
  }

  // Main UDP socket
  _udp.begin(_rxPort);
  Serial.print  ("[UDP ] Listening on : ");
  Serial.println(_rxPort);

  Serial.print("[Heap] Free before discovery socket: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" B");

  delay(200);
  _discUdpReady = _openDiscoverySocket();

  Serial.print("[Heap] Free after full init: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" B");
  Serial.println("=====================================\n");

  _jpeg.reset();
  _lastRx    = millis();
  _lastPing  = millis();
  _lastBcast = millis();

  return true;
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — loop()
// ═════════════════════════════════════════════════════════════════════════════

void PCLink::loop() {
  // Drain incoming packets
  int pktSize;
  while ((pktSize = _udp.parsePacket()) > 0) {
    if (pktSize > (int)sizeof(_rxBuf)) {
      while (_udp.available()) _udp.read();
      continue;
    }

    IPAddress sender = _udp.remoteIP();
    int len = _udp.read(_rxBuf, sizeof(_rxBuf));

    if (len >= (int)HEADER_LEN) {
      _lastRx = millis();

      if ((uint32_t)_pcIP != (uint32_t)sender) {
        _pcIP = sender;

        Serial.println();
        Serial.print  ("[PC  ] Connected   : ");
        Serial.println(_pcIP);

        // Close discovery socket after PC connects to save lwIP memory
        if (_discUdpReady) {
          _discUdp.stop();
          _discUdpReady = false;
          Serial.println("[UDP ] Discovery socket closed — saving ~2KB");
        }
      }

      _processPacket(_rxBuf, (size_t)len, sender);
    }
  }

  // Discovery broadcast beacon
  // Only broadcast while no PC/phone is connected.
  if (WiFi.status() == WL_CONNECTED &&
      millis() - _lastBcast > BCAST_INTERVAL &&
      !hasPeerIP())
  {
    _lastBcast = millis();

    if (!_discUdpReady) {
      _discUdpReady = _openDiscoverySocket();
    }

    if (_discUdpReady) {
      String msg = "ROADEYE:" + WiFi.localIP().toString();
      _discUdp.beginPacket(IPAddress(255, 255, 255, 255), _discPort);
      _discUdp.print(msg);
      _discUdp.endPacket();
    }
  }

  // Ping every 2 seconds
  if (millis() - _lastPing > 2000 && hasPeerIP()) {
    sendPing();
    _lastPing = millis();
  }

  // WiFi reconnect watchdog
  static uint8_t lastWifiStatus = WL_CONNECTED;
  uint8_t currentWifiStatus = WiFi.status();

  if (currentWifiStatus != WL_CONNECTED) {
    static uint32_t lastReconnect = 0;
    if (millis() - lastReconnect > 10000) {
      lastReconnect = millis();
      Serial.println("[WiFi] LOST → Reconnecting...");
      WiFi.reconnect();
    }
  } else if (lastWifiStatus != WL_CONNECTED) {
    Serial.println("[WiFi] Recovered — restarting services");

    MDNS.end();
    delay(100);
    if (MDNS.begin(_hostname)) {
      MDNS.addService("roadeye", "udp", _rxPort);
      Serial.println("[mDNS] Restarted after WiFi recovery");
    }

    // Restart discovery only if no peer is connected
    if (!hasPeerIP()) {
      _discUdp.stop();
      delay(200);
      _discUdpReady = _openDiscoverySocket();
    }
  }

  lastWifiStatus = currentWifiStatus;
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — _processPacket()
// ═════════════════════════════════════════════════════════════════════════════

void PCLink::_processPacket(const uint8_t* buf, size_t len, IPAddress sender) {
  uint8_t  type        = buf[0];
  uint16_t frameId     = (uint16_t)buf[1] | ((uint16_t)buf[2] << 8);
  uint8_t  chunkIdx    = buf[3];
  uint8_t  totalChunks = buf[4];
  uint8_t  payloadLen  = buf[5];

  const uint8_t* payload = buf + HEADER_LEN;

  if ((size_t)(HEADER_LEN + payloadLen) > len) {
    Serial.println("[PCLink] Malformed packet — dropping");
    return;
  }

  switch (type) {

    case PKT::JPEG_CHUNK: {
      if (!_jpegCb) break;
      bool complete = _jpeg.ingest(frameId, chunkIdx, totalChunks,
                                   payload, payloadLen);
      if (complete) {
        _jpegCb(_jpeg.buf, _jpeg.written);
        _jpeg.reset();
      }
      break;
    }

    case PKT::AUDIO: {
      if (_audioCb && payloadLen > 0)
        _audioCb(payload, payloadLen);
      break;
    }

    case PKT::NAVIGATION: {
      if (!_navCb) break;
      if (payloadLen < sizeof(NavigationPacket)) {
        Serial.print("[PCLink] Navigation too short: ");
        Serial.println(payloadLen);
        break;
      }
      NavigationPacket n;
      memcpy(&n, payload, sizeof(NavigationPacket));
      _navCb(n);
      break;
    }

    case PKT::MEDIA: {
      if (!_mediaCb) break;
      MediaPacket m;
      if (!m.decode(payload, payloadLen)) {
        Serial.println("[PCLink] Media packet malformed");
        break;
      }
      _mediaCb(m);
      break;
    }

    case PKT::DATETIME: {
      if (!_dtCb) break;
      if (payloadLen < sizeof(DateTimePacket)) {
        Serial.print("[PCLink] DateTime too short: ");
        Serial.println(payloadLen);
        break;
      }
      DateTimePacket dt;
      memcpy(&dt, payload, sizeof(DateTimePacket));
      _dtCb(dt);
      break;
    }

    case PKT::WEATHER: {
      if (!_weatherCb) break;
      if (payloadLen < sizeof(WeatherPacket)) {
        Serial.print("[PCLink] Weather too short: ");
        Serial.println(payloadLen);
        break;
      }
      WeatherPacket w;
      memcpy(&w, payload, sizeof(WeatherPacket));
      _weatherCb(w);
      break;
    }

    case PKT::PING: {
      uint8_t pong[HEADER_LEN];
      _buildHeader(pong, PKT::PONG, frameId, 0, 1, 0);
      _udp.beginPacket(sender, _txPort);
      _udp.write(pong, HEADER_LEN);
      _udp.endPacket();
      break;
    }

    case PKT::PONG:
      break;

    default:
      Serial.print("[PCLink] Unknown packet type: 0x");
      Serial.println(type, HEX);
      break;
  }
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — send helpers
// ═════════════════════════════════════════════════════════════════════════════

size_t PCLink::_buildHeader(uint8_t* out, uint8_t type, uint16_t frameId,
                             uint8_t chunkIdx, uint8_t totalChunks,
                             uint8_t payloadLen) {
  out[0] = type;
  out[1] = (uint8_t)(frameId & 0xFF);
  out[2] = (uint8_t)(frameId >> 8);
  out[3] = chunkIdx;
  out[4] = totalChunks;
  out[5] = payloadLen;
  return HEADER_LEN;
}

void PCLink::_sendSmall(uint8_t type, const uint8_t* payload, uint8_t payloadLen) {
  if (!hasPeerIP() || WiFi.status() != WL_CONNECTED) return;
  if (payloadLen > MAX_CHUNK_PAYLOAD) return;

  _buildHeader(_txBuf, type, _txFrameId++, 0, 1, payloadLen);
  if (payloadLen > 0) memcpy(_txBuf + HEADER_LEN, payload, payloadLen);

  _udp.beginPacket(_pcIP, _txPort);
  _udp.write(_txBuf, HEADER_LEN + payloadLen);
  _udp.endPacket();
}

void PCLink::sendSensorData(const SensorOutPacket& s) {
  _sendSmall(PKT::SENSOR_OUT,
             reinterpret_cast<const uint8_t*>(&s),
             (uint8_t)sizeof(SensorOutPacket));
}

void PCLink::sendImuData(const ImuOutPacket& i) {
  _sendSmall(PKT::IMU_OUT,
             reinterpret_cast<const uint8_t*>(&i),
             (uint8_t)sizeof(ImuOutPacket));
}

void PCLink::sendWearState(uint8_t state) {
  _sendSmall(PKT::WEAR_OUT, &state, 1);
}

void PCLink::sendPing() {
  _sendSmall(PKT::PING, nullptr, 0);
}
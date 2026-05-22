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

  if (total != chunksNeeded) {
    reset();
    return false;
  }

  size_t offset = (size_t)idx * MAX_CHUNK_PAYLOAD;
  if (offset + len > MAX_JPEG_FRAME_BYTES) {
    Serial.println("[PCLink] JPEG buffer overflow");
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
      Serial.println("[WiFi] Hint         : Check SSID / Password");

      Serial.println("\n[UDP ] Port        : ");
      Serial.println(_rxPort);

      Serial.println("=====================================\n");
      return false;
    }
  }

  // ── WiFi Connected ─────────────────────────────────────────────
  Serial.println("[WiFi] Status       : Connected");

  Serial.print  ("[WiFi] IP Address   : ");
  Serial.println(WiFi.localIP());

  Serial.print  ("[WiFi] Signal (RSSI): ");
  Serial.print  (WiFi.RSSI());
  Serial.println(" dBm");

  // ── UDP Setup ──────────────────────────────────────────────────
  _udp.begin(_rxPort);

  Serial.print  ("[UDP ] Listening on: ");
  Serial.println(_rxPort);

  Serial.println("=====================================\n");

  _jpeg.reset();
  _lastRx  = millis();
  _lastPing = millis();

  return true;
}


// ═════════════════════════════════════════════════════════════════════════════
//  PCLink — loop()
// ═════════════════════════════════════════════════════════════════════════════

void PCLink::loop() {
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
      }

      _processPacket(_rxBuf, (size_t)len, sender);
    }
  }

  // Ping every 2 seconds
  if (millis() - _lastPing > 2000 && hasPeerIP()) {
    sendPing();
    _lastPing = millis();
  }

  // WiFi reconnect watchdog
  if (WiFi.status() != WL_CONNECTED) {
    static uint32_t lastReconnect = 0;

    if (millis() - lastReconnect > 10000) {
      lastReconnect = millis();

      Serial.println();
      Serial.println("[WiFi] Status      : LOST → Reconnecting...");

      WiFi.reconnect();
    }
  }
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
    Serial.println("[PCLink] Malformed packet");
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
      if (_audioCb && payloadLen > 0) {
        _audioCb(payload, payloadLen);
      }
      break;
    }

    case PKT::TELEMETRY: {
      if (!_telemCb) break;

      if (payloadLen < sizeof(TelemetryPacket)) {
        Serial.print("[PCLink] Telemetry too short: ");
        Serial.println(payloadLen);
        break;
      }

      TelemetryPacket t;
      memcpy(&t, payload, sizeof(TelemetryPacket));
      _telemCb(t);
      break;
    }

    case PKT::PING: {
    uint8_t pong[HEADER_LEN];
    _buildHeader(pong, PKT::PONG, frameId, 0, 1, 0);

    // IMPORTANT: reply to the actual sender, not only _pcIP.
    // This makes the first mobile-app ping work as the connection handshake.
    _udp.beginPacket(sender, _txPort);
    _udp.write(pong, HEADER_LEN);
    _udp.endPacket();
    break;
    }


    case PKT::PONG:
      break;

    default:
      Serial.print("[PCLink] Unknown packet: 0x");
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

  if (payloadLen > 0) {
    memcpy(_txBuf + HEADER_LEN, payload, payloadLen);
  }

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
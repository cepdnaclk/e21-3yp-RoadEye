// --- main.cpp (updated) ---

#include <WiFi.h>
#include <TFT_eSPI.h>
#include <TJpg_Decoder.h>

const char* ssid     = "NSWick";
const char* password = "RoadEye123";

WiFiServer server(5005);   // TCP port
WiFiClient client;         // ✅ persistent client (fixes disconnect-on-return)

TFT_eSPI tft = TFT_eSPI();

#define MAX_JPEG_SIZE 20000

uint8_t jpegBuffer[MAX_JPEG_SIZE];
uint32_t expectedSize = 0;
uint32_t receivedSize = 0;
bool receivingFrame = false;

// TJpgDec callback
bool tft_output(int16_t x, int16_t y,
                uint16_t w, uint16_t h,
                uint16_t* bitmap)
{
  if (y >= tft.height()) return false;
  tft.pushImage(x, y, w, h, bitmap);
  return true;
}

static void resetFrameState() {
  receivingFrame = false;
  expectedSize = 0;
  receivedSize = 0;
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  server.begin();
  Serial.println("TCP server started, waiting for client...");

  tft.init();
  tft.setRotation(0);
  tft.setSwapBytes(true);
  tft.fillScreen(TFT_BLACK);

  TJpgDec.setJpgScale(1);
  TJpgDec.setSwapBytes(false);
  TJpgDec.setCallback(tft_output);

  resetFrameState();
}

void loop() {
  // ✅ Accept / maintain client connection
  if (!client || !client.connected()) {
    client = server.available();
    if (client) {
      client.setNoDelay(true);     // ✅ helps ACK go out immediately
      Serial.println("Client connected");
      resetFrameState();
    }
    delay(1);
    return;
  }

  // --- State 1: Read 4-byte frame size ---
  if (!receivingFrame) {
    if (client.available() < 4) {
      delay(1);
      return; // ✅ safe now (client is global)
    }

    client.read((uint8_t*)&expectedSize, 4); // little-endian matches Python "<I"

    if (expectedSize == 0 || expectedSize > MAX_JPEG_SIZE) {
      Serial.printf("Bad/too large frame size: %u\n", expectedSize);

      // Drain any pending bytes to avoid desync
      while (client.available()) client.read();

      resetFrameState();
      delay(1);
      return;
    }

    receivedSize = 0;
    receivingFrame = true;
  }

  // --- State 2: Read JPEG data payload ---
  if (receivingFrame) {
    int avail = client.available();
    if (avail <= 0) {
      delay(1);
      return;
    }

    int bytesToRead = (int)(expectedSize - receivedSize);
    if (bytesToRead > avail) bytesToRead = avail;

    int n = client.read(jpegBuffer + receivedSize, bytesToRead);
    if (n > 0) receivedSize += (uint32_t)n;

    // --- Complete frame ---
    if (receivedSize >= expectedSize) {
      tft.startWrite();
      TJpgDec.drawJpg(0, 0, jpegBuffer, expectedSize);
      tft.endWrite();

      // ✅ Send acknowledgment (1 byte)
      uint8_t ack = 0x01;
      client.write(&ack, 1);

      // NOTE: WiFiClient::flush() on ESP32 is not a "force send" call (mostly RX-related)
      // client.flush();

      resetFrameState();
    }
  }
}
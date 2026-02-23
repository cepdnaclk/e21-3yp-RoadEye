#include <WiFi.h>
#include <TFT_eSPI.h>
#include <TJpg_Decoder.h>

const char* ssid     = "NSWick";
const char* password = "RoadEye123";

WiFiServer server(5005);   // TCP port

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
  TJpgDec.setSwapBytes(true);
  TJpgDec.setCallback(tft_output);
}

void loop() {
  WiFiClient client;
  if (!client || !client.connected()) {
      client = server.available();
      if (!client) return;  // no client yet
  }

  while (client.connected()) {
    // Read frame size
    if (!receivingFrame) {
      if (client.available() >= 4) {
        client.read((uint8_t*)&expectedSize, 4);
        if (expectedSize > MAX_JPEG_SIZE) {
          Serial.println("Frame too large!");
          client.flush();
          continue;
        }
        receivedSize = 0;
        receivingFrame = true;
      }
      else return; // wait for more data
    }

    // Read JPEG data
    if (receivingFrame) {
      int bytesToRead = expectedSize - receivedSize;
      if (bytesToRead > 0) {
        int n = client.read(jpegBuffer + receivedSize, bytesToRead);
        if (n > 0) receivedSize += n;
      }

      // Complete frame
      if (receivedSize >= expectedSize) {
        tft.startWrite();
        TJpgDec.drawJpg(0, 0, jpegBuffer, expectedSize);
        tft.endWrite();

        // Send acknowledgment (1 byte)
        uint8_t ack = 0x01;
        client.write(&ack, 1);   // send 1 byte
        client.flush();          // ensure it is sent immediately

        receivingFrame = false;
        expectedSize = 0;
        receivedSize = 0;
      }
    }
  }
}
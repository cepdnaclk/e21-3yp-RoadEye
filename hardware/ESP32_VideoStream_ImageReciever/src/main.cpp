#include <WiFi.h>
#include <WiFiUdp.h>
#include <TFT_eSPI.h>

const char* ssid     = "NSWick";
const char* password = "RoadEye123";

WiFiUDP udp;
const unsigned int localPort = 5005;

#define WIDTH 128
#define HEIGHT 160
#define FRAME_PIXELS (WIDTH * HEIGHT)
#define FRAME_BYTES  (FRAME_PIXELS * 2)

uint16_t frameBuffer[FRAME_PIXELS];
uint32_t totalBytes = 0;

TFT_eSPI tft = TFT_eSPI();

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  udp.begin(localPort);
  Serial.println("UDP ready");

  tft.init();
  tft.setRotation(0);
  tft.setSwapBytes(true);   // keep this ON for little-endian Python

  // Display test
  tft.fillScreen(TFT_RED);   delay(500);
  tft.fillScreen(TFT_GREEN); delay(500);
  tft.fillScreen(TFT_BLUE);  delay(500);
  tft.fillScreen(TFT_BLACK);
}

void loop() {

  int packetSize = udp.parsePacket();
  if (packetSize) {

    uint8_t* bytePtr = (uint8_t*)frameBuffer;

    // If packet would overflow frame, reset buffer
    if (totalBytes + packetSize > FRAME_BYTES) {
      Serial.println("Frame overflow - resetting buffer");
      totalBytes = 0;
      udp.flush();
      return;
    }

    int len = udp.read(bytePtr + totalBytes, packetSize);
    totalBytes += len;

    // When full frame received
    if (totalBytes == FRAME_BYTES) {

      Serial.println("Displaying frame");
      Serial.print("First pixel: ");
      Serial.println(frameBuffer[0], HEX);

      tft.startWrite();
      tft.pushImage(0, 0, WIDTH, HEIGHT, frameBuffer);
      tft.endWrite();

      totalBytes = 0;
    }
  }
}
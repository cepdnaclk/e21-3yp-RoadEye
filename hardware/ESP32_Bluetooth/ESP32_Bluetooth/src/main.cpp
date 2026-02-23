#include <Arduino.h>
#include <TFT_eSPI.h>
#include "BluetoothSerial.h"

TFT_eSPI tft;
BluetoothSerial SerialBT;

const char* BT_NAME = "ESP32-WROOM-SERIAL";

String lastShown = "";

// Draw the “header” (your original look) + the received text
void drawScreen(const String& msg) {
  tft.fillScreen(TFT_BLACK);

  // Your original header text
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);
  tft.setCursor(20, 10);
  tft.println("Hello!");

  tft.setTextSize(1);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.setCursor(10, 40);
  tft.println("ESP32 + ST7735");

  // ---- Received text area ----
  tft.setTextSize(2);
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.setCursor(10, 55);
  tft.println("RX:");

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setCursor(10, 75);

  // Simple wrap/truncate if message is long
  String out = msg;
  if (out.length() > 18) out = out.substring(0, 18); // fits roughly at size=2
  tft.println(out);
}

// Read one line from Bluetooth (terminated by '\n')
bool readBTLine(String& outLine) {
  static String buf = "";

  while (SerialBT.available()) {
    char c = (char)SerialBT.read();

    if (c == '\r') continue; // ignore CR

    if (c == '\n') {
      outLine = buf;
      buf = "";
      outLine.trim();
      return outLine.length() > 0;
    } else {
      buf += c;

      // safety: if newline never comes, flush after some length
      if (buf.length() > 200) {
        outLine = buf;
        buf = "";
        outLine.trim();
        return outLine.length() > 0;
      }
    }
  }
  return false;
}

void setup() {
  Serial.begin(115200);

  // ----- TFT (your working setup) -----
  tft.init();
  tft.setRotation(1);
  drawScreen("Waiting...");

  // ----- Bluetooth SPP -----
  if (!SerialBT.begin(BT_NAME)) {
    Serial.println("Failed to start BluetoothSerial");
    drawScreen("BT FAIL");
    while (true) delay(1000);
  }

  Serial.println("Bluetooth started. Pair with PC.");
  SerialBT.println("ESP32 ready. Send a line of text.");

  drawScreen("Pair + Send");
}

void loop() {
  if (SerialBT.hasClient()) {
    String msg;
    if (readBTLine(msg)) {
      lastShown = msg;

      Serial.print("BT RX: ");
      Serial.println(msg);

      drawScreen(msg);

      SerialBT.print("ACK: ");
      SerialBT.println(msg);
    }
  } else {
    // Not connected yet
    delay(150);
  }
}

#include <Arduino.h>
#include <TFT_eSPI.h>

TFT_eSPI tft;

void setup() {
  tft.init();
  tft.setRotation(1);              // try 0/1/2/3 if you want different orientation
  tft.fillScreen(TFT_BLACK);

  // Basic text using GLCD font
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);              // 1 = small, 2 = medium, 3 = large

  tft.setCursor(20, 10);
  tft.println("Hello!");

  tft.setTextSize(1);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.setCursor(10, 40);
  tft.println("ESP32 + ST7735");

  tft.setTextSize(2);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.setCursor(10, 70);
  tft.println("128 x 160");
}

void loop() {
  // nothing
}

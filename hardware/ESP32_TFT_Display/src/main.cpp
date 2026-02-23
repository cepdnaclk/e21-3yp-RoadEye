#include <Arduino.h>
#include <TFT_eSPI.h>

#include "anime.h"
#include "melina.h"

#define TOUCH_PIN 27
#define HALL_PIN  26

TFT_eSPI tft = TFT_eSPI();

bool showFirstImage = true;

bool lastTouchState = false;
bool lastHallState  = false;

unsigned long lastToggleTime = 0;
const unsigned long debounceDelay = 250;  // ms

void drawImage() {
  tft.fillScreen(TFT_BLACK);

  if (showFirstImage) {
    tft.pushImage(0, 0, 128, 160, anime);
  } else {
    tft.pushImage(0, 0, 128, 160, melina);
  }
}

void toggleImage(const char* source) {
  unsigned long now = millis();

  // Debounce protection (shared)
  if (now - lastToggleTime < debounceDelay) return;

  showFirstImage = !showFirstImage;

  Serial.print(source);
  Serial.println(" → Switching image");

  drawImage();

  lastToggleTime = now;
}

void setup() {
  Serial.begin(115200);

  pinMode(TOUCH_PIN, INPUT);
  pinMode(HALL_PIN, INPUT);

  tft.init();
  tft.setRotation(0);
  tft.setSwapBytes(true);

  drawImage();
}

void loop() {
  bool touchState = digitalRead(TOUCH_PIN);
  bool hallState  = digitalRead(HALL_PIN);

  // ---- Touch sensor (active HIGH) ----
  if (touchState && !lastTouchState) {
    toggleImage("Touch detected");
  }

  // ---- Hall sensor (active LOW) ----
  if (hallState && !lastHallState) {
    toggleImage("Magnet detected");
  }

  lastTouchState = touchState;
  lastHallState  = hallState;
}

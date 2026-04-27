#pragma once

#include <Arduino.h>
#include <TFT_eSPI.h>

class DisplayManager {
public:

    void begin(uint8_t rotation = 1);

    void blackScreen(); 

    void setBackground(const uint16_t* img, int width, int height);

    // Call once per frame: draws bg + all text into sprite, then pushes
    void beginFrame();
    void drawText(int x, int y, const String& text,
                  uint16_t color = TFT_WHITE);
    void endFrame();

    void drawIcon(int x, int y, const uint16_t* icon, int w, int h,
              uint16_t transparentColor = 0xF81F);

private:
    TFT_eSPI tft;
    TFT_eSprite sprite = TFT_eSprite(&tft);  // off-screen buffer

    const uint16_t* bgImg  = nullptr;
    int bgWidth  = 0;
    int bgHeight = 0;
};
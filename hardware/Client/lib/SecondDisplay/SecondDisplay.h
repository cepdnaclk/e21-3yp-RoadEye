#pragma once

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <JPEGDEC.h>

#define TFT2_CS   15
#define TFT2_DC   27
#define TFT2_RST  14

#define MAP_X  0
#define MAP_Y  0

#define SCREEN_W  320
#define SCREEN_H  240

class SecondDisplay {
public:
    void begin(uint8_t rotation = 1);
    void drawImage(const uint16_t* img, int w, int h);
    void drawJpeg(const uint8_t* buf, size_t len);
    void blackScreen();
    void drawDebugCubes();

private:
    Adafruit_ST7789 tft = Adafruit_ST7789(TFT2_CS, TFT2_DC, TFT2_RST);
    JPEGDEC         jpeg;

    friend int jpegDrawCallback(JPEGDRAW* pDraw);
};
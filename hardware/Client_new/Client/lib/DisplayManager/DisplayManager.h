#pragma once
#include <Arduino.h>
#include <TFT_eSPI.h>
#include <JPEGDEC.h>

class DisplayManager {
public:
    void begin(uint8_t rotation = 3);
    void blackScreen();

    // Frame lifecycle
    void beginFrame();
    void endFrame();

    // JPEG — direct to TFT (fastest, no compositing)
    void drawJpeg(const uint8_t* buf, size_t len);

    // JPEG — into sprite so HUD can be layered on top before endFrame()
    void drawJpegToSprite(const uint8_t* buf, size_t len);

    // Drawing (sprite when available, direct TFT fallback)
    void drawText(int x, int y, const String& text,
                  uint16_t color = TFT_WHITE);
    void drawTextF(int x, int y, const String& text,
                   uint8_t font, uint16_t color = TFT_WHITE);
    void drawIcon(int x, int y, const uint16_t* icon, int w, int h,
                  uint16_t transparentColor = 0xF81F);
    void drawRect(int x, int y, int w, int h, uint16_t color = TFT_WHITE);

    // Legacy
    void setBackground(const uint16_t* img, int width, int height);

    // Called by JPEG decode callbacks — do not call directly
    void drawPixelDirect(int x, int y, uint16_t colour);
    void drawPixelToSprite(int x, int y, uint16_t colour);

    bool useSprite = false;   // readable externally for diagnostics

private:
    TFT_eSPI    tft;
    TFT_eSprite sprite = TFT_eSprite(&tft);
    JPEGDEC     jpeg;

    const uint16_t* bgImg    = nullptr;
    int             bgWidth  = 0;
    int             bgHeight = 0;

    void _decodeJpeg(const uint8_t* buf, size_t len, int (*callback)(JPEGDRAW*));
};
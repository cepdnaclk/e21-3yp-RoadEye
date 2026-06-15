#pragma once

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <JPEGDEC.h>

#define TFT2_CS   15
#define TFT2_DC   27
#define TFT2_RST  14

// Physical screen dimensions (landscape)
#define SCREEN_W  320
#define SCREEN_H  240

// ── Banded sprite buffering ───────────────────────────────────────────────────
#define BAND_H    40
#define NUM_BANDS (SCREEN_H / BAND_H)   // 6

// ── Icon rotation constants ───────────────────────────────────────────────────
#define ROT_0    0
#define ROT_90   1
#define ROT_180  2
#define ROT_270  3

class SecondDisplay {
public:
    void begin(uint8_t rotation = 1);
    void blackScreen();
    void drawDebugCubes();

    void beginFrame();
    void endFrame();

    void _mirrorCanvasH();

    void drawIcon(int x, int y, const uint16_t* icon, int w, int h,
                  uint8_t rot = ROT_0,
                  uint16_t transparentColor = 0xF81F);

    void fillRect(int x, int y, int w, int h, uint16_t color);

    void drawText          (int x, int y, const String& text,
                            uint8_t size = 1, uint16_t color = 0xFFFF);
    void drawTextSmall     (int x, int y, const String& text,
                            uint16_t color = 0xFFFF);
    void drawTextMedium    (int x, int y, const String& text,
                            uint16_t color = 0xFFFF);
    void drawTextExtraLarge(int x, int y, const String& text,
                            uint16_t color = 0xFFFF);
    void drawTextHuge      (int x, int y, const String& text,
                            uint16_t color = 0xFFFF);

    Adafruit_ST7789 tft = Adafruit_ST7789(TFT2_CS, TFT2_DC, TFT2_RST);

private:
    GFXcanvas16 _canvas{SCREEN_W, BAND_H};

    enum CmdType : uint8_t { CMD_ICON = 1, CMD_RECT = 2, CMD_TEXT = 3 };

    struct Cmd {
        CmdType         type;
        int16_t         x, y, w, h;
        uint16_t        color;
        uint8_t         rot;
        const uint16_t* pixels;
        char            text[64];
    };

    static constexpr int MAX_CMDS = 64;
    Cmd  _cmds[MAX_CMDS];
    int  _nCmds = 0;

    void _pushCmd(const Cmd& c);
    void _renderBand(int bandY);

    static void _rotatePixel(int px, int py, int w, int h, uint8_t rot,
                              int& ox, int& oy, int& outW, int& outH);
};
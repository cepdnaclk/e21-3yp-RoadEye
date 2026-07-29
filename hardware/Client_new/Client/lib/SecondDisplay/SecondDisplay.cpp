#include "SecondDisplay.h"

// ─────────────────────────────────────────────────────────────────────────────
//  Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

void SecondDisplay::begin(uint8_t /*rotation*/) {
    tft.init(240, 320);
    tft.setRotation(1);
    tft.invertDisplay(true);
    tft.fillScreen(0x0000);
    _nCmds = 0;
}

void SecondDisplay::blackScreen() {
    tft.fillScreen(0x0000);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Frame lifecycle
// ─────────────────────────────────────────────────────────────────────────────

void SecondDisplay::beginFrame() {
    _nCmds = 0;
}

void SecondDisplay::endFrame() {
    for (int band = 0; band < NUM_BANDS; band++) {
        _renderBand(band * BAND_H);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Horizontal mirror of the band canvas (for reflective HUD optics)
// ─────────────────────────────────────────────────────────────────────────────
void SecondDisplay::_mirrorCanvasH() {
    uint16_t* buf = _canvas.getBuffer();
    for (int row = 0; row < BAND_H; row++) {
        uint16_t* rowPtr = buf + row * SCREEN_W;
        int left = 0, right = SCREEN_W - 1;
        while (left < right) {
            uint16_t tmp   = rowPtr[left];
            rowPtr[left++] = rowPtr[right];
            rowPtr[right--] = tmp;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  _renderBand
// ─────────────────────────────────────────────────────────────────────────────

void SecondDisplay::_renderBand(int bandY) {
    const int bandYEnd = bandY + BAND_H;

    _canvas.fillScreen(0x0000);
    _canvas.setTextWrap(false);

    for (int i = 0; i < _nCmds; i++) {
        const Cmd& c = _cmds[i];

        switch (c.type) {

        case CMD_RECT: {
            int ry0 = max((int)c.y,      bandY)    - bandY;
            int ry1 = min((int)c.y + c.h, bandYEnd) - bandY;
            if (ry1 <= ry0) break;

            int rx0 = max((int)c.x, 0);
            int rx1 = min((int)c.x + c.w, SCREEN_W);
            if (rx1 <= rx0) break;

            _canvas.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0, c.color);
            break;
        }

        case CMD_ICON: {
            const uint16_t* src    = c.pixels;
            const int       srcW   = c.w;
            const int       srcH   = c.h;
            const uint16_t  transp = c.color;
            const uint8_t   rot    = c.rot;

            for (int row = 0; row < srcH; row++) {
                for (int col = 0; col < srcW; col++) {
                    uint16_t px = src[row * srcW + col];
                    if (px == transp) continue;

                    int ox, oy, ow, oh;
                    _rotatePixel(col, row, srcW, srcH, rot, ox, oy, ow, oh);

                    int screenX = c.x + ox;
                    int screenY = c.y + oy;

                    if (screenX < 0 || screenX >= SCREEN_W) continue;
                    if (screenY < bandY || screenY >= bandYEnd) continue;

                    _canvas.drawPixel(screenX, screenY - bandY, px);
                }
            }
            break;
        }

        case CMD_TEXT: {
            int textH  = 8 * (int)c.rot + 2;
            int textY0 = c.y;
            int textY1 = c.y + textH;

            if (textY1 < bandY || textY0 >= bandYEnd) break;

            _canvas.setTextSize(c.rot);
            _canvas.setTextColor(c.color);
            _canvas.setCursor(c.x, c.y - bandY);
            _canvas.print(c.text);
            break;
        }

        }
    }
    
    _mirrorCanvasH(); 

    tft.drawRGBBitmap(0, bandY, _canvas.getBuffer(), SCREEN_W, BAND_H);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Command recording
// ─────────────────────────────────────────────────────────────────────────────

void SecondDisplay::_pushCmd(const Cmd& c) {
    if (_nCmds >= MAX_CMDS) {
        Serial.println("[SecondDisplay] Command list full — increase MAX_CMDS");
        return;
    }
    _cmds[_nCmds++] = c;
}

void SecondDisplay::fillRect(int x, int y, int w, int h, uint16_t color) {
    Cmd c{};
    c.type  = CMD_RECT;
    c.x     = x;  c.y = y;  c.w = w;  c.h = h;
    c.color = color;
    _pushCmd(c);
}

void SecondDisplay::drawIcon(int x, int y,
                              const uint16_t* icon, int w, int h,
                              uint8_t rot, uint16_t transparentColor) {
    Cmd c{};
    c.type   = CMD_ICON;
    c.x      = x;  c.y = y;  c.w = w;  c.h = h;
    c.color  = transparentColor;
    c.rot    = rot;
    c.pixels = icon;
    _pushCmd(c);
}

void SecondDisplay::drawText(int x, int y, const String& text,
                              uint8_t size, uint16_t color) {
    Cmd c{};
    c.type  = CMD_TEXT;
    c.x     = x;  c.y = y;
    c.rot   = size;
    c.color = color;
    strncpy(c.text, text.c_str(), sizeof(c.text) - 1);
    c.text[sizeof(c.text) - 1] = '\0';
    _pushCmd(c);
}

void SecondDisplay::drawTextSmall(int x, int y, const String& text,
                                   uint16_t color) {
    drawText(x, y, text, 1, color);
}

void SecondDisplay::drawTextMedium(int x, int y, const String& text,
                                    uint16_t color) {
    drawText(x, y, text, 2, color);
}

void SecondDisplay::drawTextExtraLarge(int x, int y, const String& text,
                                        uint16_t color) {
    drawText(x, y, text, 4, color);
}

void SecondDisplay::drawTextHuge(int x, int y, const String& text,
                                  uint16_t color) {
    drawText(x, y, text, 5, color);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Rotation helper
// ─────────────────────────────────────────────────────────────────────────────

void SecondDisplay::_rotatePixel(int px, int py, int w, int h, uint8_t rot,
                                  int& ox, int& oy, int& outW, int& outH) {
    switch (rot & 3) {
        default:       ox = px;          oy = py;          outW = w; outH = h; break;
        case ROT_90:   ox = h-1-py;      oy = px;          outW = h; outH = w; break;
        case ROT_180:  ox = w-1-px;      oy = h-1-py;      outW = w; outH = h; break;
        case ROT_270:  ox = py;          oy = w-1-px;      outW = h; outH = w; break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Debug cubes
// ─────────────────────────────────────────────────────────────────────────────

void SecondDisplay::drawDebugCubes() {
    constexpr int SIZE = 20, GAP = 4;
    int xB = SCREEN_W - SIZE;
    int xG = xB - SIZE - GAP;
    int xR = xG - SIZE - GAP;
    int y  = SCREEN_H - SIZE;
    tft.fillRect(xR, y, SIZE, SIZE, 0xF800);
    tft.fillRect(xG, y, SIZE, SIZE, 0x07E0);
    tft.fillRect(xB, y, SIZE, SIZE, 0x001F);
}
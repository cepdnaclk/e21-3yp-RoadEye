#include "DisplayManager.h"
#include <Arduino.h>

// ── Static callback state ─────────────────────────────────────────────────────
static DisplayManager* _activeDisplayMgr = nullptr;

// ── JPEG → TFT direct callback ────────────────────────────────────────────────
static int displayMgrJpegDirectCb(JPEGDRAW* pDraw) {
    if (!_activeDisplayMgr) return 0;

    for (int row = 0; row < pDraw->iHeight; row++) {
        for (int col = 0; col < pDraw->iWidth; col++) {
            uint16_t colour = pDraw->pPixels[row * pDraw->iWidth + col];
            int x = pDraw->x + col;
            int y = 4 + pDraw->y + row;   // MAP_Y offset
            _activeDisplayMgr->drawPixelDirect(x, y, colour);
        }
    }
    return 1;
}

// ── Pixel writer ─────────────────────────────────────────────────────────────
void DisplayManager::drawPixelDirect(int x, int y, uint16_t colour) {
    tft.drawPixel(x, y, colour);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
void DisplayManager::begin(uint8_t rotation) {
    tft.init();
    tft.setRotation(rotation);
    tft.setViewport(1, 2, 160, 128);
    tft.setSwapBytes(true);
    tft.fillScreen(TFT_BLACK);

    tft.writecommand(0x36);        // MADCTL
    tft.writedata(0xE0); 

    // ❌ SPRITE COMPLETELY DISABLED (saves ~41KB heap)
    useSprite = false;

    Serial.printf("[Display1] Sprite disabled. Heap: %d B\n",
                  ESP.getFreeHeap());
}

// ── FRAME ────────────────────────────────────────────────────────────────────
void DisplayManager::beginFrame() {
    // nothing (direct draw mode)
}

void DisplayManager::endFrame() {
    // nothing (direct draw mode)
}

void DisplayManager::blackScreen() {
    tft.fillScreen(TFT_BLACK);
}

// ── JPEG ─────────────────────────────────────────────────────────────────────
void DisplayManager::_decodeJpeg(const uint8_t* buf, size_t len,
                                 int (*callback)(JPEGDRAW*)) {
    if (!buf || len == 0) return;

    uint8_t* mutableBuf = const_cast<uint8_t*>(buf);

    if (!jpeg.openRAM(mutableBuf, (int)len, callback)) {
        Serial.printf("[Display1] JPEG open failed (err %d)\n",
                      jpeg.getLastError());
        return;
    }

    jpeg.setPixelType(RGB565_LITTLE_ENDIAN);

    _activeDisplayMgr = this;
    int rc = jpeg.decode(0, 0, 0);
    _activeDisplayMgr = nullptr;

    jpeg.close();

    if (rc != 1) {
        Serial.printf("[Display1] JPEG decode error %d\n",
                      jpeg.getLastError());
    }
}

// Direct draw ONLY
void DisplayManager::drawJpeg(const uint8_t* buf, size_t len) {
    _decodeJpeg(buf, len, displayMgrJpegDirectCb);
}

// Sprite path removed → fallback to direct
void DisplayManager::drawJpegToSprite(const uint8_t* buf, size_t len) {
    _decodeJpeg(buf, len, displayMgrJpegDirectCb);
}

// ── DRAW ─────────────────────────────────────────────────────────────────────
void DisplayManager::drawText(int x, int y, const String& text, uint16_t color) {
    tft.setTextFont(1);
    tft.setTextSize(1);
    tft.setTextColor(color, TFT_BLACK);
    tft.setCursor(x, y);
    tft.print(text);
}

void DisplayManager::drawTextF(int x, int y, const String& text,
                              uint8_t font, uint16_t color) {
    tft.setTextFont(font);
    tft.setTextColor(color, TFT_BLACK);
    tft.setCursor(x, y);
    tft.print(text);
    tft.setTextFont(1);
}

void DisplayManager::drawIcon(int x, int y, const uint16_t* icon,
                             int w, int h, uint16_t transparentColor) {
    tft.pushImage(x, y, w, h,
                  const_cast<uint16_t*>(icon), transparentColor);
}

void DisplayManager::drawRect(int x, int y, int w, int h, uint16_t color) {
    tft.fillRect(x, y, w, h, color);
}

// ── LEGACY ───────────────────────────────────────────────────────────────────
void DisplayManager::setBackground(const uint16_t* img,
                                   int width, int height) {
    bgImg    = img;
    bgWidth  = width;
    bgHeight = height;
}
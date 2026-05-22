#include "SecondDisplay.h"

static SecondDisplay* _activeDisplay = nullptr;

int jpegDrawCallback(JPEGDRAW* pDraw) {
    if (!_activeDisplay) return 0;

    constexpr int SCALE = 2;   // 120×120 → 240×240

    for (int row = 0; row < pDraw->iHeight; row++) {
        for (int col = 0; col < pDraw->iWidth; col++) {
            uint16_t colour = pDraw->pPixels[row * pDraw->iWidth + col];

            int x = MAP_X + (pDraw->x + col) * SCALE;
            int y = MAP_Y + (pDraw->y + row) * SCALE;

            if (x < 0 || y < 0 || x >= SCREEN_W || y >= SCREEN_H) continue;

            _activeDisplay->tft.fillRect(x, y, SCALE, SCALE, colour);
        }
    }

    return 1;
}

void SecondDisplay::begin(uint8_t rotation) {
    tft.init(240, 320);          // physical panel dimensions stay the same
    tft.setRotation(1);          // 1 = landscape, overrides the parameter
    tft.invertDisplay(true);
    tft.fillScreen(ST77XX_BLACK);
    drawDebugCubes();
}

void SecondDisplay::drawImage(const uint16_t* img, int w, int h) {
    int x = (SCREEN_W - w) / 2;
    int y = (SCREEN_H - h) / 2;
    tft.drawRGBBitmap(x, y, img, w, h);
    drawDebugCubes();
}

void SecondDisplay::blackScreen() {
    tft.fillScreen(ST77XX_BLACK);
    drawDebugCubes();
}

void SecondDisplay::drawJpeg(const uint8_t* buf, size_t len) {
    if (!buf || len == 0) return;

    uint8_t* mutableBuf = const_cast<uint8_t*>(buf);

    if (!jpeg.openRAM(mutableBuf, (int)len, jpegDrawCallback)) {
        Serial.printf("[SecondDisplay] JPEGDEC open failed (err %d)\n",
                      jpeg.getLastError());
        drawDebugCubes();
        return;
    }

    jpeg.setPixelType(RGB565_LITTLE_ENDIAN);

    _activeDisplay = this;
    int rc = jpeg.decode(0, 0, 0);
    _activeDisplay = nullptr;

    jpeg.close();

    if (rc != 1) {
        Serial.printf("[SecondDisplay] JPEGDEC decode error %d\n",
                      jpeg.getLastError());
    }

    drawDebugCubes();
}

void SecondDisplay::drawDebugCubes() {
    // Three 20×20 squares in the bottom-right corner of the landscape screen
    // Layout (right to left):  [R] [G] [B]  at x=319, y=239
    constexpr int SIZE   = 20;
    constexpr int GAP    = 4;
    constexpr int BOTTOM = SCREEN_H - 1;   // 239
    constexpr int RIGHT  = SCREEN_W - 1;   // 319

    int xB = RIGHT  - SIZE + 1;
    int xG = xB     - SIZE - GAP;
    int xR = xG     - SIZE - GAP;
    int y  = BOTTOM - SIZE + 1;

    tft.fillRect(xR, y, SIZE, SIZE, ST77XX_RED);
    tft.fillRect(xG, y, SIZE, SIZE, ST77XX_GREEN);
    tft.fillRect(xB, y, SIZE, SIZE, ST77XX_BLUE);
}
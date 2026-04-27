#include "DisplayManager.h"

void DisplayManager::begin(uint8_t rotation) {
    tft.init();
    tft.setRotation(rotation);

    // Shift the viewport to correct the 1px horizontal, 2px vertical offset
    tft.setViewport(1, 2, 160, 128);

    tft.setSwapBytes(true);
    tft.fillScreen(TFT_BLACK);

    sprite.createSprite(160, 128);
    sprite.setSwapBytes(true);
    sprite.setTextFont(1);
    sprite.setTextSize(1);
}

void DisplayManager::setBackground(const uint16_t* img, int width, int height) {
    bgImg   = img;
    bgWidth  = width;
    bgHeight = height;
}

// Call at the start of each frame — blits background into sprite
void DisplayManager::beginFrame() {
    if (bgImg != nullptr) {
        sprite.pushImage(0, 0, bgWidth, bgHeight, bgImg);
    } else {
        sprite.fillSprite(TFT_BLACK);
    }
}

// Draw text into the sprite (not the screen)
void DisplayManager::drawText(int x, int y, const String& text, uint16_t color) {
    sprite.setTextColor(color); // keep bg visible behind text
    sprite.setCursor(x, y);
    sprite.print(text);
}

// Push the completed frame to the display in one atomic operation
void DisplayManager::endFrame() {
    sprite.pushSprite(0, 0);
}

void DisplayManager::drawIcon(int x, int y, const uint16_t* icon, int w, int h, uint16_t transparentColor) {
    sprite.pushImage(x, y, w, h, const_cast<uint16_t*>(icon), transparentColor);
}

void DisplayManager::blackScreen() {
    sprite.fillSprite(TFT_BLACK);   // blank the sprite
    sprite.pushSprite(0, 0);        // push it to the physical display
}
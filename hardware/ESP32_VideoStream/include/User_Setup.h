#pragma once

// -------- Display driver --------
#define ST7735_DRIVER
#define JPEG_SUPPORT

// -------- TFT size (your display is 128x160) --------
#define TFT_WIDTH  128
#define TFT_HEIGHT 160

// -------- SPI pins (VSPI default on ESP32) --------
#define TFT_MOSI 23
#define TFT_SCLK 18
#define TFT_CS    5
#define TFT_DC    2     // A0 on your module = DC
#define TFT_RST   4

// Optional (if your module had MISO; most ST7735 modules don’t)
#define TFT_MISO -1

// -------- SPI frequency --------
#define SPI_FREQUENCY  27000000  // 27 MHz usually fine for ST7735

// Fonts (optional, but fine to keep)
#define LOAD_GLCD
#define LOAD_FONT2
#define LOAD_FONT4
#define LOAD_FONT6
#define LOAD_FONT7
#define LOAD_FONT8
#define LOAD_GFXFF
#define SMOOTH_FONT

#define TFT_RGB_ORDER TFT_RGB


#pragma once

#define ST7735_DRIVER

#define TFT_WIDTH  128
#define TFT_HEIGHT 160

#define TFT_MOSI 23
#define TFT_SCLK 18
#define TFT_CS    5
#define TFT_DC    2
#define TFT_RST   4
#define TFT_MISO -1

#define SPI_FREQUENCY  27000000
#define TFT_RGB_ORDER TFT_BGR

#define LOAD_GLCD   // required for basic print()/println() text
#define SMOOTH_FONT
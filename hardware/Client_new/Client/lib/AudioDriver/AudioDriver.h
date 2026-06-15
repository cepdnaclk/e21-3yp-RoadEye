#ifndef AUDIO_DRIVER_H
#define AUDIO_DRIVER_H

#include <Arduino.h>
#include <driver/i2s.h>

class AudioDriver {
private:
    i2s_port_t i2s_port;
    int bclk, lrc, din;

public:
    AudioDriver(i2s_port_t port, int bclkPin, int lrcPin, int dinPin);

    void begin();
    void write(uint8_t* data, size_t len);      // raw 16-bit signed PCM
    void writeMono8(const uint8_t* data, size_t len); // 8-bit unsigned → 16-bit signed
};

#endif
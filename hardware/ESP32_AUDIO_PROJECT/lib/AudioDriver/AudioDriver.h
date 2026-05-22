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
    void write(uint8_t* data, size_t len);
};

#endif
#ifndef AUDIO_DRIVER_H
#define AUDIO_DRIVER_H

#include <Arduino.h>
#include <driver/i2s.h>

class AudioDriver {
public:
    // ── Sample rate — single source of truth ─────────────────────────────────
    // Must match the phone-side TARGET_SAMPLE_RATE in MusicPlayer.jsx (22050).
    // Exposed here so main.cpp::playTestTone() and any other caller can read it
    // instead of duplicating a magic number.
    static constexpr uint32_t SAMPLE_RATE = 22050;

    AudioDriver(i2s_port_t port, int bclkPin, int lrcPin, int dinPin);

    void begin();
    void write(uint8_t* data, size_t len);           // raw 16-bit signed PCM
    void writeMono8(const uint8_t* data, size_t len); // 8-bit unsigned → 16-bit signed

private:
    i2s_port_t i2s_port;
    int bclk, lrc, din;
};

#endif
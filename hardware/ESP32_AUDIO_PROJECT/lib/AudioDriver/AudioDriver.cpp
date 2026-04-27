#include "AudioDriver.h"

AudioDriver::AudioDriver(i2s_port_t port, int bclkPin, int lrcPin, int dinPin) {
    i2s_port = port;
    bclk = bclkPin;
    lrc = lrcPin;
    din = dinPin;
}

void AudioDriver::begin() {
    i2s_config_t config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = 44100,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = 0,
        .dma_buf_count = 8,
        .dma_buf_len = 256
    };

    i2s_pin_config_t pins = {
        .bck_io_num = bclk,
        .ws_io_num = lrc,
        .data_out_num = din,
        .data_in_num = I2S_PIN_NO_CHANGE
    };

    i2s_driver_install(i2s_port, &config, 0, NULL);
    i2s_set_pin(i2s_port, &pins);
}

void AudioDriver::write(uint8_t* data, size_t len) {
    size_t written;
    i2s_write(i2s_port, data, len, &written, portMAX_DELAY);
}
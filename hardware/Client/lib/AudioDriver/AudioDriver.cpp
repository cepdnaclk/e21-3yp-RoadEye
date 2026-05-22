#include "AudioDriver.h"

AudioDriver::AudioDriver(i2s_port_t port, int bclkPin, int lrcPin, int dinPin) {
    i2s_port = port;
    bclk     = bclkPin;
    lrc      = lrcPin;
    din      = dinPin;
}

void AudioDriver::begin() {
    i2s_config_t config = {
        .mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),

        // ── FIX 1: sample_rate was 8000, phone sends 22050 Hz ────────────────
        // Use the class constant so this never drifts out of sync again.
        .sample_rate          = SAMPLE_RATE,

        .bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags     = 0,

        // ── FIX 2: dma_buf_len was 256 — too small at 22050 Hz ───────────────
        // At 22050 Hz, 256 samples ≈ 11.6 ms per buffer.  With 8 buffers that's
        // only ~93 ms of headroom; any network jitter causes an audible underrun
        // pop.  512 samples ≈ 23.2 ms per buffer → ~185 ms headroom, matches
        // the phone-side CHUNK_SIZE (480 samples, ~21.7 ms) comfortably.
        .dma_buf_count        = 8,
        .dma_buf_len          = 512,

        // ── FIX 3: use_apll was absent (defaults to false) ───────────────────
        // Without APLL the I2S clock is derived from the 80 MHz APB bus via an
        // integer divider, which cannot hit 22050 Hz exactly → slight pitch
        // shift and audible jitter.  APLL generates a fractional-N clock that
        // hits 22050 Hz within ~0.01 %, eliminating the distortion.
        .use_apll             = true,

        .tx_desc_auto_clear   = true,   // silence (zero) on underrun instead of repeating last buffer
        .fixed_mclk           = 0
    };

    i2s_pin_config_t pins = {
        .bck_io_num   = bclk,
        .ws_io_num    = lrc,
        .data_out_num = din,
        .data_in_num  = I2S_PIN_NO_CHANGE
    };

    i2s_driver_install(i2s_port, &config, 0, NULL);
    i2s_set_pin(i2s_port, &pins);
}

// Pass-through for already-formatted 16-bit signed PCM
void AudioDriver::write(uint8_t* data, size_t len) {
    size_t written;
    i2s_write(i2s_port, data, len, &written, portMAX_DELAY);
}

// Convert 8-bit unsigned PCM → 16-bit signed, then send to I2S.
// Input range [0, 255] where 128 = silence.
void AudioDriver::writeMono8(const uint8_t* data, size_t len) {
    constexpr size_t CHUNK = 512;   // bumped to match dma_buf_len
    int16_t buf[CHUNK];

    size_t i = 0;
    while (i < len) {
        size_t batch = min(len - i, CHUNK);
        for (size_t j = 0; j < batch; j++) {
            // Shift unsigned [0,255] to signed [-128,127], then scale to 16-bit
            buf[j] = (int16_t)((int8_t)(data[i + j] - 128)) << 8;
        }
        size_t written;
        i2s_write(i2s_port, buf, batch * sizeof(int16_t), &written, portMAX_DELAY);
        i += batch;
    }
}
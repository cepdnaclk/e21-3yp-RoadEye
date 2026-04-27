#include <Arduino.h>
#include "BluetoothA2DPSink.h"
#include "driver/i2s.h"

// ===== Bluetooth Speaker =====
BluetoothA2DPSink a2dp_sink;

#define SPK_BCLK 26
#define SPK_LRC  27
#define SPK_DOUT 25

// ===== Microphone (INMP441) =====
#define MIC_BCLK 14
#define MIC_LRC  15
#define MIC_DIN  32

#define I2S_MIC_PORT I2S_NUM_1   // separate I2S bus for mic

int32_t mic_buffer[256];

// ===================== MICROPHONE SETUP =====================
void setup_mic() {
  i2s_config_t config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = MIC_BCLK,
    .ws_io_num = MIC_LRC,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = MIC_DIN
  };

  i2s_driver_install(I2S_MIC_PORT, &config, 0, NULL);
  i2s_set_pin(I2S_MIC_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_MIC_PORT);

  Serial.println("Mic Ready");
}

// ===================== BLUETOOTH STATUS =====================
void connection_state_changed(esp_a2d_connection_state_t state, void *ptr) {
  if (state == ESP_A2D_CONNECTION_STATE_CONNECTED)
    Serial.println("BT Connected");
  else
    Serial.println("BT Disconnected");
}

// ===================== AUDIO SETUP FIX (IMPORTANT) =====================
void setup_audio() {

  i2s_pin_config_t spk_pins = {
    .bck_io_num = SPK_BCLK,
    .ws_io_num = SPK_LRC,
    .data_out_num = SPK_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_config_t i2s_audio_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  a2dp_sink.set_pin_config(spk_pins);
  a2dp_sink.set_i2s_config(i2s_audio_config);   // 🔥 FIX THAT RESTORES SOUND
  a2dp_sink.set_on_connection_state_changed(connection_state_changed);

  a2dp_sink.start("ESP32_SPEAKER");
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);

  setup_audio();   // 🔊 Bluetooth audio FIXED
  setup_mic();     // 🎤 Microphone

  Serial.println("System Ready");
}

// ===================== LOOP =====================
void loop() {
  size_t bytes_read = 0;

  i2s_read(I2S_MIC_PORT, mic_buffer, sizeof(mic_buffer), &bytes_read, portMAX_DELAY);

  long sum = 0;

  for (int i = 0; i < 256; i++) {
    int32_t sample = mic_buffer[i] >> 8;  // INMP441 correction
    sum += abs(sample);
  }

  int level = sum / 256;

  Serial.println(level);

  delay(50);
}
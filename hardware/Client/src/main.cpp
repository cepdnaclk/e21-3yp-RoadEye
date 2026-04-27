#include <Arduino.h>
#include <math.h>
#include "SensorBLEClient.h"
#include "DisplayManager.h"
#include "background.h"
#include "slider.h"
#include "distancesider.h"
#include "distancerear.h"
#include "drive.h"
#include "SecondDisplay.h"
#include "AudioDriver.h"
#include "MPU6050.h"
#include "Weardetector.h"
#include "PCLink.h"       


static const char* WIFI_SSID = "NSWick";
static const char* WIFI_PASS = "RoadEye123";


static constexpr uint16_t UDP_PORT = 4210;

// How often to push sensor + IMU data to the PC (ms)
static constexpr uint32_t SENSOR_SEND_INTERVAL = 100;   // 10 Hz
static constexpr uint32_t IMU_SEND_INTERVAL    = 50;    // 20 Hz


AudioDriver    audio(I2S_NUM_0, 26, 25, 22);
SensorBLEClient ble;
DisplayManager display;
SensorData     latest;
SecondDisplay  display2;

MPU6050     imu(33, 32);
WearDetector wear(imu, IMU_INT_PIN);

PCLink pclink;

#define TFT1_CS 5
#define TFT2_CS 15


// ═══════════════════════════════════════════════════════════════════════════════
//  TEST TONE
//
//  Generates a short sine-wave beep through the I2S amplifier so you can
//  confirm wiring and gain settings before live audio arrives from the PC.
//
//  freq  – tone frequency in Hz  (440 = concert A)
//  ms    – duration in milliseconds
//
//  FIX (bug 1 + 2): SAMPLE_RATE was hardcoded to 8000 here while AudioDriver
//  was also independently set to 8000 — both were wrong (phone sends 22050).
//  Now both read AudioDriver::SAMPLE_RATE so they can never drift apart again.
//  The local constexpr has been removed; use the canonical class constant.
// ═══════════════════════════════════════════════════════════════════════════════

static void playTestTone(uint16_t freq = 440, uint32_t ms = 800) {
    // ── FIX: was `constexpr uint32_t SAMPLE_RATE = 8000;` ───────────────────
    // That caused the tone to play at 22050/8000 ≈ 2.76× the intended pitch
    // once AudioDriver was corrected to 22050 Hz, because the sine is computed
    // against the old rate but clocked out at the new one.
    const uint32_t sampleRate = AudioDriver::SAMPLE_RATE;  // 22050

    constexpr size_t CHUNK = 256;
    uint8_t          buf[CHUNK];

    const uint32_t totalSamples = (sampleRate * ms) / 1000UL;
    uint32_t       produced     = 0;

    while (produced < totalSamples) {
        size_t batch = min((uint32_t)CHUNK, totalSamples - produced);
        for (size_t i = 0; i < batch; i++) {
            float s = sinf(2.0f * M_PI * freq * (float)(produced + i) / (float)sampleRate);
            buf[i]  = (uint8_t)((s * 100.0f) + 128.0f);  // amplitude ≈ 40 % to avoid clipping
        }
        audio.writeMono8(buf, batch);
        produced += batch;
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  JPEG MAP — displayed on display2 when a full frame arrives
// ═══════════════════════════════════════════════════════════════════════════════

static volatile bool     jpegReady  = false;
static uint8_t           jpegBuf[20000];
static size_t            jpegLen    = 0;

void onJpegFrame(const uint8_t* jpeg, size_t len) {
  Serial.printf("[JPEG] Frame received: %u bytes\n", (unsigned)len);
  if (len > sizeof(jpegBuf)) {
    Serial.printf("[JPEG] Frame too large, dropping (%u > %u)\n", (unsigned)len, (unsigned)sizeof(jpegBuf));
    return;
  }
  memcpy(jpegBuf, jpeg, len);
  jpegLen   = len;
  jpegReady = true;
}

// ── Audio ─────────────────────────────────────────────────────────────────────

void onAudioChunk(const uint8_t* pcm, size_t len) {
    Serial.printf("[Audio] Packet received: %u bytes\n", (unsigned)len);
    audio.writeMono8(pcm, len);
}

// ── Telemetry (location / weather arriving from PC) ───────────────────────────

static TelemetryPacket lastTelemetry = {};

void onTelemetry(const TelemetryPacket& t) {
  lastTelemetry = t;
  Serial.printf("[Telem] %.5f,%.5f  spd=%.1f  T=%.1f°C\n",
                t.lat, t.lng, t.speed, t.tempC);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  TIMING
// ═══════════════════════════════════════════════════════════════════════════════

static unsigned long lastDraw        = 0;
static unsigned long lastIMUPrint    = 0;
static unsigned long lastSensorSend  = 0;
static unsigned long lastImuSend     = 0;

static constexpr uint16_t frameInterval    = 100;
static constexpr uint16_t imuPrintInterval = 200;


void initDisplays();
void drawHUD();


void onData(const SensorData& d) {
  latest = d;
}

void setup() {
  Serial.begin(115200);

  // ── Audio ──────────────────────────────────────────────────────────────────
  audio.begin();
  delay(100);

  // ── Speaker test tone ──────────────────────────────────────────────────────
  // Plays a 440 Hz beep for 800 ms so you can verify the amp/speaker wiring.
  // Remove or comment out this line once confirmed working.
  playTestTone(440, 8000);

  // ── Displays ───────────────────────────────────────────────────────────────
  initDisplays();

  // ── IMU ────────────────────────────────────────────────────────────────────
  if (!imu.begin(ACCEL_RANGE_2G, GYRO_RANGE_250DPS)) {
    //Serial.println("[IMU] MPU-6050 not found — check SDA/SCL wiring!");
  } else {
    //Serial.println("[IMU] MPU-6050 ready.");
    wear.begin();
  }

  // ── BLE ────────────────────────────────────────────────────────────────────
  ble.setCallback(onData);
  ble.begin();

  // ── PCLink (WiFi + UDP) ────────────────────────────────────────────────────
  pclink.setWiFi(WIFI_SSID, WIFI_PASS);
  pclink.setPort(UDP_PORT);
  pclink.onJpegFrame(onJpegFrame);
  pclink.onAudioChunk(onAudioChunk);
  pclink.onTelemetry(onTelemetry);

  if (!pclink.begin(15000)) {
    Serial.println("[PCLink] Running without PC link.");
  }
}


void loop() {
  static WearState prevWearState = WearState::ACTIVE;

  WearState wearState = wear.update();

  // ── Blank displays on transition into SLEEPING ────────────────────────────
  if (wearState == WearState::SLEEPING &&
      prevWearState != WearState::SLEEPING)
  {
    display.blackScreen();
    display2.blackScreen();
  }
  prevWearState = wearState;

  if (wearState == WearState::SLEEPING) {
    pclink.loop();
    pclink.sendWearState(2);   // 2 = SLEEPING
    delay(WEAR_SAMPLE_INTERVAL_MS);
    return;
  }

  // ── Resuming from sleep ───────────────────────────────────────────────────
  if (prevWearState == WearState::SLEEPING && wearState == WearState::ACTIVE) {
    initDisplays();
  }

  // ── PCLink tick ───────────────────────────────────────────────────────────
  pclink.loop();

  // ── BLE ───────────────────────────────────────────────────────────────────
  ble.loop();

  // ── Send sensor readings to PC ────────────────────────────────────────────
  unsigned long now = millis();

  if (now - lastSensorSend >= SENSOR_SEND_INTERVAL) {
    lastSensorSend = now;

    SensorOutPacket s;
    s.distLeft     = latest.distLeft;
    s.distRight    = latest.distRight;
    s.distRear     = latest.distRear;
    s.forwardAccel = latest.forwardAccel;
    s.roll         = latest.roll;
    s.temperature  = latest.temperature;
    s.humidity     = latest.humidity;
    s.vibration    = latest.vibration;
    s.isRiding     = latest.isRiding ? 1 : 0;

    pclink.sendSensorData(s);

    uint8_t ws = (wearState == WearState::ACTIVE)  ? 0
               : (wearState == WearState::IDLE)    ? 1
               :                                     2;
    pclink.sendWearState(ws);
  }

  // ── Send IMU data to PC ───────────────────────────────────────────────────
  if (now - lastImuSend >= IMU_SEND_INTERVAL) {
    lastImuSend = now;

    ImuData imuData;
    if (imu.read(imuData)) {
      ImuOutPacket ip;
      ip.accelX = imuData.ax;
      ip.accelY = imuData.ay;
      ip.accelZ = imuData.az;
      ip.gyroX  = imuData.gx;
      ip.gyroY  = imuData.gy;
      ip.gyroZ  = imuData.gz;
      pclink.sendImuData(ip);
    }
  }

  // ── IMU serial debug ──────────────────────────────────────────────────────
  if (now - lastIMUPrint >= imuPrintInterval) {
    lastIMUPrint = now;

    ImuData imuData;
    if (imu.read(imuData)) {
      if (wearState == WearState::IDLE) {
        //Serial.printf("[Wear] Idle — sleeping in %lu s\n",
                      //wear.idleRemainingMs() / 1000UL);
      }
    } else {
      //Serial.println("[IMU] Read error");
    }
  }

  // ── Draw JPEG map frame if one arrived ────────────────────────────────────
  if (jpegReady) {
    jpegReady = false;
    display2.drawJpeg(jpegBuf, jpegLen);
  }

  // ── HUD frame throttle ────────────────────────────────────────────────────
  if (millis() - lastDraw < frameInterval) return;
  lastDraw = millis();

  drawHUD();
}

void initDisplays() {
  display.begin(1);
  display.setBackground(background, 160, 128);

  pinMode(TFT1_CS, OUTPUT);
  digitalWrite(TFT1_CS, HIGH);

  display2.begin(2);
  display2.blackScreen();
}

void drawHUD() {
  display.beginFrame();

  float accel = constrain(latest.forwardAccel, -1.5f, 1.5f);
  int   accelY = 60 - (int)round((accel / 1.5f) * 33.0f);
  display.drawIcon(15, accelY, slider, 7, 7, TFT_BLACK);

  float roll  = constrain(latest.roll, -90.0f, 90.0f);
  int   rollX = 73 + (int)round((roll / 90.0f) * 33.0f);
  display.drawIcon(rollX, 21, slider, 7, 7, TFT_BLACK);

  float distR  = constrain(latest.distRight, 0.0f, 400.0f);
  int   distRX = 85 + (int)round((distR / 400.0f) * (123 - 85));
  display.drawIcon(distRX, 52, distancesider, 3, 22, TFT_BLACK);

  float distL  = constrain(latest.distLeft, 0.0f, 400.0f);
  int   distLX = 65 - (int)round((distL / 400.0f) * (65 - 27));
  display.drawIcon(distLX, 52, distancesider, 3, 22, TFT_BLACK);

  float distRear = constrain(latest.distRear, 0.0f, 600.0f);
  int   distRY   = 82 + (int)round((distRear / 600.0f) * (116 - 82));
  display.drawIcon(71, distRY, distancerear, 11, 3, TFT_BLACK);

  if (latest.isRiding) {
    display.drawIcon(140, 107, drive, 18, 18, TFT_BLACK);
  }

  display.drawText(3,   9,   String(fabs(latest.forwardAccel), 2) + "g", 0);
  display.drawText(63,  9,   String(fabs(latest.roll), 2) + "'", 0);

  float displayTemp = (pclink.hasPeerIP() && millis() - pclink.lastRxMs() < 10000)
                    ? lastTelemetry.tempC
                    : latest.temperature;
  display.drawText(118, 9,   String(displayTemp, 1) + "C");

  display.drawText(118, 32,  String(latest.humidity, 1) + "%");
  display.drawText(120, 112, String(latest.vibration, 1));
  display.drawText(23,  85,  String(latest.distLeft,  1) + "cm", 0);
  display.drawText(88,  85,  String(latest.distRight, 1) + "cm", 0);
  display.drawText(23,  106, String(latest.distRear,  1) + "cm", 0);

  display.endFrame();
}

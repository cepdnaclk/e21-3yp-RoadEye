#include <Arduino.h>
#include <math.h>
#include "SensorBLEClient.h"
#include "DisplayManager.h"
#include "SecondDisplay.h"
#include "AudioDriver.h"
#include "MPU6050.h"
#include "Weardetector.h"
#include "PCLink.h"

// ── Sprite headers ────────────────────────────────────────────────────────────
// Display 2
#include "accel.h"
#include "distance.h"
#include "bike_top.h"
#include "phone.h"
#include "helmet.h"
#include "bike.h"
#include "music_icon.h"
#include "music_progress.h"
#include "roll_scale.h"
#include "roll_slider.h"
// Display 1
#include "journey_point.h"
#include "journey_arrow.h"
#include "weather_sunny.h"
#include "weather_cloudy.h"
#include "weather_rainy.h"


// ── WiFi credentials ──────────────────────────────────────────────────────────
static const char* WIFI_SSID = "NSWick";
static const char* WIFI_PASS = "RoadEye123";

// ── Port config ───────────────────────────────────────────────────────────────
static constexpr uint16_t UDP_PORT = 4210;

// ── Timing ────────────────────────────────────────────────────────────────────
static constexpr uint32_t SENSOR_SEND_INTERVAL = 100;  // 10 Hz
static constexpr uint32_t IMU_SEND_INTERVAL    = 50;   // 20 Hz


// ── Peripherals ───────────────────────────────────────────────────────────────
AudioDriver     audio(I2S_NUM_0, 26, 25, 22);
SensorBLEClient ble;
DisplayManager  display;
SensorData      latest;
SecondDisplay   display2;
MPU6050         imu(33, 32);
WearDetector    wear(imu, IMU_INT_PIN);
PCLink          pclink;

#define TFT1_CS 5
#define TFT2_CS 15


// ═══════════════════════════════════════════════════════════════════════════════
//  INBOUND DATA STATE
// ═══════════════════════════════════════════════════════════════════════════════

static NavigationPacket lastNav      = {};
static MediaPacket      lastMedia    = {};
static DateTimePacket   lastDateTime = {};
static WeatherPacket    lastWeather  = {};

// JPEG frame globals
static volatile bool g_jpegReady = false;
static uint8_t       g_jpegBuf[8000];
static size_t        g_jpegLen  = 0;


// ═══════════════════════════════════════════════════════════════════════════════
//  CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

void onJpegFrameReal(const uint8_t* jpeg, size_t len) {
    if (len > sizeof(g_jpegBuf)) return;
    memcpy(g_jpegBuf, jpeg, len);
    g_jpegLen   = len;
    g_jpegReady = true;
}

void onAudioChunk(const uint8_t* pcm, size_t len) {
    audio.writeMono8(pcm, len);
}

void onNavigation(const NavigationPacket& n) { lastNav      = n; }
void onMedia     (const MediaPacket&      m) { lastMedia    = m; }
void onDateTime  (const DateTimePacket&  dt) { lastDateTime = dt; }
void onWeather   (const WeatherPacket&    w) { lastWeather  = w; }
void onData      (const SensorData&       d) { latest       = d; }


// ═══════════════════════════════════════════════════════════════════════════════
//  TIMING STATE
// ═══════════════════════════════════════════════════════════════════════════════

static unsigned long lastDraw2      = 0;
static unsigned long lastIMUPrint   = 0;
static unsigned long lastSensorSend = 0;
static unsigned long lastImuSend    = 0;

static constexpr uint16_t frameInterval    = 100;
static constexpr uint16_t imuPrintInterval = 200;


// ── Forward declarations ──────────────────────────────────────────────────────
void initDisplays();
void drawHUD();
void drawDisplay2();


// ═══════════════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════════════

void setup() {
    Serial.begin(115200);

    audio.begin();
    delay(100);

    initDisplays();

    if (!imu.begin(ACCEL_RANGE_2G, GYRO_RANGE_250DPS)) {
        Serial.println("[IMU ] Not found — continuing without IMU");
    } else {
        wear.begin();
    }

    ble.setCallback(onData);
    ble.begin();

    pclink.setWiFi(WIFI_SSID, WIFI_PASS);pclink.setPort(UDP_PORT);
pclink.onJpegFrame  (onJpegFrameReal);
    pclink.onAudioChunk (onAudioChunk);
    pclink.onNavigation (onNavigation);
    pclink.onMedia      (onMedia);
    pclink.onDateTime   (onDateTime);
    pclink.onWeather    (onWeather);

    if (!pclink.begin(15000)) {
        Serial.println("[PCLink] Running without PC link.");
    }

    Serial.print("[Heap] Free after setup(): ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" B");
}


// ═══════════════════════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════════════════════

void loop() {
    wear.update();  // keep state machine ticking; state is not acted upon

    pclink.loop();
    ble.loop();

    unsigned long now = millis();

    // ── Send sensor data ───────────────────────────────────────────────────────
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

        uint8_t ws = (wear.state() == WearState::ACTIVE) ? 0 : 1;
        pclink.sendWearState(ws);
    }

    // ── Send IMU data ──────────────────────────────────────────────────────────
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

    // ── IMU FIFO flush ─────────────────────────────────────────────────────────
    if (now - lastIMUPrint >= imuPrintInterval) {
        lastIMUPrint = now;
        ImuData imuData;
        imu.read(imuData);
    }

    // ── Draw JPEG map on Display 1 ─────────────────────────────────────────────
    if (g_jpegReady) {
        g_jpegReady = false;
        display.drawJpeg(g_jpegBuf, g_jpegLen);
    }

    // ── Frame throttle ─────────────────────────────────────────────────────────
    if (millis() - lastDraw2 < frameInterval) return;
    lastDraw2 = millis();

    drawHUD();
    drawDisplay2();
}


// ═══════════════════════════════════════════════════════════════════════════════
//  INIT DISPLAYS
// ═══════════════════════════════════════════════════════════════════════════════

void initDisplays() {
    display.begin(3);
    pinMode(TFT1_CS, OUTPUT);
    digitalWrite(TFT1_CS, HIGH);
    display2.begin(1);
    display2.blackScreen();
}


// ═══════════════════════════════════════════════════════════════════════════════
//  DRAW HUD — Display 1 (128×160)
// ═══════════════════════════════════════════════════════════════════════════════

static const uint16_t* weatherIconFor(uint8_t icon) {
    if (icon == WeatherIcon::RAIN)   return weather_rainy;
    if (icon == WeatherIcon::CLOUDY) return weather_cloudy;
    return weather_sunny;
}

void drawHUD() {
    display.beginFrame();

    display.drawIcon(123, 2,   journey_point, 14, 20);
    display.drawIcon(123, 104, journey_point, 14, 20);

    {
        float pct    = constrain(lastNav.completionPct, 0.0f, 100.0f);
        int   arrowY = 24 + (int)round((pct / 100.0f) * (88 - 24));
        display.drawIcon(123, arrowY, journey_arrow, 12, 16);
    }

    display.drawIcon(141, 2,   weatherIconFor(lastNav.startWeather), 16, 16);
    display.drawIcon(141, 106, weatherIconFor(lastNav.destWeather),  16, 16);

    display.drawTextF(66, 102, String(lastNav.distRemaining, 1) + "km", 2);

    display.drawRect(129, 24, 2, 78);

    display.endFrame();
}


// ═══════════════════════════════════════════════════════════════════════════════
//  DRAW DISPLAY 2 (320×240)
// ═══════════════════════════════════════════════════════════════════════════════

void drawDisplay2() {
    display2.beginFrame();

    // ── Acceleration icon ──────────────────────────────────────────────────────
    {
        float accelVal = latest.forwardAccel;
        if      (accelVal >  0.05f) display2.drawIcon(125, 73,  accel, 13, 13, ROT_0);
        else if (accelVal < -0.05f) display2.drawIcon(125, 101, accel, 13, 13, ROT_180);
    }

    // ── Distance indicators ────────────────────────────────────────────────────
    {
        constexpr float DIST_MAX_LR   = 400.0f;
        constexpr float DIST_MAX_REAR = 600.0f;
        constexpr int   LR_RANGE      = 34;
        constexpr int   REAR_RANGE    = 54;

        float dr = constrain(latest.distRight, 0.0f, DIST_MAX_LR);
        int rxOffset = (int)round((1.0f - dr / DIST_MAX_LR) * LR_RANGE);
        display2.drawIcon(294 - rxOffset, 53, distance, 11, 29, ROT_0);

        float drear = constrain(latest.distRear, 0.0f, DIST_MAX_REAR);
        int ryOffset = (int)round((1.0f - drear / DIST_MAX_REAR) * REAR_RANGE);
        display2.drawIcon(230, 141 - ryOffset, distance, 11, 29, ROT_90);

        float dl = constrain(latest.distLeft, 0.0f, DIST_MAX_LR);
        int lxOffset = (int)round((1.0f - dl / DIST_MAX_LR) * LR_RANGE);
        display2.drawIcon(188 + lxOffset, 53, distance, 11, 29, ROT_180);
    }

    // ── Static bike diagram ────────────────────────────────────────────────────
    display2.drawIcon(231, 34,  bike_top, 27, 50);
    display2.drawIcon(254, 162, phone,    14, 24);
    display2.drawIcon(251, 193, helmet,   23, 18);
    display2.drawIcon(246, 214, bike,     33, 21);

    // ── Music ──────────────────────────────────────────────────────────────────
    display2.drawIcon(9, 185, music_icon, 40, 40);
    {
        float pct  = constrain(lastMedia.progressPct, 0.0f, 100.0f);
        int   dotX = 55 + (int)round((pct / 100.0f) * 128.0f);
        display2.drawIcon(dotX, 215, music_progress, 10, 10);
    }

    // ── Roll indicator ─────────────────────────────────────────────────────────
    display2.drawIcon(189, 13, roll_scale, 110, 15);
    {
        float roll    = constrain(latest.roll, -90.0f, 90.0f);
        int   sliderX = 242 + (int)round((roll / 90.0f) * 60.0f);
        display2.drawIcon(sliderX, 12, roll_slider, 5, 15);
    }

    // ── Text ───────────────────────────────────────────────────────────────────
    {
        char timeBuf[9];
        snprintf(timeBuf, sizeof(timeBuf), "%02d:%02d",
                 lastDateTime.hour, lastDateTime.minute);
        display2.drawTextMedium(3, 7, String(timeBuf));
    }

    display2.drawTextHuge(10, 72, String((int)round(lastNav.speed)) + " kmph");
    display2.drawTextMedium(52, 185, String(lastMedia.songName));
    display2.drawTextSmall (52, 205, String(lastMedia.author));

    // ── Lines ──────────────────────────────────────────────────────────────────
    display2.fillRect(8,   171, 224, 1, 0xFFFF);
    display2.fillRect(55,  220, 138, 1, 0xFFFF);
    display2.fillRect(186,  67,  47, 1, 0xFFFF);
    display2.fillRect(255,  67,  47, 1, 0xFFFF);
    display2.fillRect(244,  93,   1, 62, 0xFFFF);

    display2.endFrame();
}
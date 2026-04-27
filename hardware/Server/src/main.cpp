#include <Arduino.h>
#include "SensorBLEServer.h"
#include "IMUProcessor.h"
#include "DHTSensor.h"
#include "DistanceSensors.h"

// ── Pin assignments ─────────────────────────────────────────────────────────
// JSN-SR04T-3.0  (rear, waterproof)
#define REAR_TRIG  32
#define REAR_ECHO  33

// HC-SR04  (left)
#define LEFT_TRIG  18
#define LEFT_ECHO  19

// HC-SR04  (right)
#define RIGHT_TRIG 25
#define RIGHT_ECHO 26
// ────────────────────────────────────────────────────────────────────────────

DHTSensor        dht;
SensorBLEServer  ble;
IMUProcessor     imu;
DistanceSensors  dist(REAR_TRIG,  REAR_ECHO,
                      LEFT_TRIG,  LEFT_ECHO,
                      RIGHT_TRIG, RIGHT_ECHO);

unsigned long lastSend = 0;
const float sendInterval = 100000; // 100 ms in micros

// Distance sensors are slow (~75 ms for all three); update them less often.
unsigned long lastDistUpdate    = 0;
const unsigned long DIST_INTERVAL_MS = 80; // ms

void setup() {
    Serial.begin(115200);

    dht.begin(23);
    imu.begin();
    ble.begin("ESP32-Server");
    dist.begin();
}

void loop() {
    imu.update();
    dht.update();

    // Update distance sensors on their own slower cadence (non-blocking cadence,
    // but each individual measurement is still a blocking pulseIn call).
    unsigned long nowMs = millis();
    if (nowMs - lastDistUpdate >= DIST_INTERVAL_MS) {
        lastDistUpdate = nowMs;
        dist.update(); // fires rear → left → right sequentially
    }

    // BLE send at fixed 100 ms rate
    unsigned long now = micros();
    if (now - lastSend >= sendInterval) {
        lastSend = now;

        IMUData d = imu.getData();

        SensorData data;
        data.forwardAccel = d.forwardAccel;
        data.roll         = d.roll;
        data.vibration    = d.vibration;
        data.isRiding     = d.isRiding;

        data.temperature  = dht.getTemperature();
        data.humidity     = dht.getHumidity();

        // Distance readings (cached from last dist.update())
        data.distRear  = dist.getRear();
        data.distLeft  = dist.getLeft();
        data.distRight = dist.getRight();

        ble.send(data);

        Serial.printf(
            "Accel: %.2f | Roll: %.2f | Vib: %.2f | Ride: %d | "
            "Temp: %.2f | Hum: %.2f | "
            "Rear: %.1f cm | Left: %.1f cm | Right: %.1f cm\n",
            d.forwardAccel, d.roll, d.vibration, d.isRiding,
            data.temperature, data.humidity,
            data.distRear, data.distLeft, data.distRight
        );
    }
}
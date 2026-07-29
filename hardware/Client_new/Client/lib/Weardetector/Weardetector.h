#pragma once

#include <Arduino.h>
#include "MPU6050.h"

// ─── Tuning constants ─────────────────────────────────────────────────────────

#define WEAR_SAMPLE_INTERVAL_MS         100UL
#define WEAR_ACCEL_THRESHOLD_G          0.15f
#define WEAR_CONFIRM_SAMPLES            3
#define WEAR_STILL_CONFIRM_SAMPLES      5
#define IMU_INT_PIN                     34
#define MPU_MOT_THRESHOLD               60
#define MPU_MOT_DURATION                5

// ─── Wear states ──────────────────────────────────────────────────────────────

enum class WearState {
    ACTIVE,   // confirmed movement
    IDLE      // confirmed stillness
};

// ─────────────────────────────────────────────────────────────────────────────

class WearDetector {
public:
    explicit WearDetector(MPU6050 &imu, int intPin = IMU_INT_PIN);

    void      begin();
    WearState update();
    WearState state() const { return _state; }

private:
    MPU6050  &_imu;
    int       _intPin;
    WearState _state;

    unsigned long _lastSampleMs;

    uint8_t _movingCount;
    uint8_t _stillCount;

    float _accelDelta();
    void  _toActive();
    void  _toIdle();
};
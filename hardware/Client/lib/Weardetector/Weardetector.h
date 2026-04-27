#pragma once

#include <Arduino.h>
#include "MPU6050.h"

// ─── Tuning constants ─────────────────────────────────────────────────────────

// Inactivity timeout before the SLEEPING state is entered (ms)
#define WEAR_IDLE_TIMEOUT_MS            300000UL

// IMU polling interval (ms)
#define WEAR_SAMPLE_INTERVAL_MS         100UL

// Acceleration magnitude delta from 1 g to count as a candidate movement sample.
// Must be well above the MPU-6050 noise floor (~0.05 g worst-case at ±2 g).
// 0.15 g = clearly deliberate motion; raise further if false wakes persist.
#define WEAR_ACCEL_THRESHOLD_G          0.15f

// Number of consecutive samples that must exceed the threshold to confirm movement.
// At 100 ms intervals: 3 = 300 ms of continuous motion required.
// Prevents single noise spikes from triggering a state change.
#define WEAR_CONFIRM_SAMPLES            3

// Consecutive below-threshold samples required to confirm stillness (for ACTIVE→IDLE).
// Prevents brief pauses (e.g. slow cornering) from triggering the idle countdown.
#define WEAR_STILL_CONFIRM_SAMPLES      5

// GPIO connected to MPU-6050 INT pin (-1 to disable hardware pin check).
#define IMU_INT_PIN                     34

// MPU-6050 hardware motion detection threshold (1 LSB = 2 mg at ±2 g range).
// Keep this consistent with WEAR_ACCEL_THRESHOLD_G:
//   0.15 g = 150 mg → 75 LSB.  Start at 60 for a little margin.
#define MPU_MOT_THRESHOLD               60

// Samples above threshold before the IMU fires its interrupt
#define MPU_MOT_DURATION                5

// ─── Wear states ──────────────────────────────────────────────────────────────

enum class WearState {
    ACTIVE,     // confirmed movement — all systems running
    IDLE,       // confirmed stillness, counting down to sleep
    SLEEPING    // application idle; BLE and IMU polling still running
};

// ─────────────────────────────────────────────────────────────────────────────

class WearDetector {
public:
    explicit WearDetector(MPU6050 &imu, int intPin = IMU_INT_PIN);

    void      begin();
    WearState update();
    WearState state() const { return _state; }
    uint32_t  idleRemainingMs() const;

private:
    MPU6050  &_imu;
    int       _intPin;
    WearState _state;

    unsigned long _lastSampleMs;
    unsigned long _lastMotionMs;

    // Consecutive-sample counters for debouncing
    uint8_t _movingCount;   // samples above threshold in a row
    uint8_t _stillCount;    // samples below threshold in a row

    void _configureMotionInterrupt();
    void _clearIMUInterrupt();

    // Returns the raw delta-from-1g magnitude (not yet thresholded)
    float _accelDelta();

    void _toActive();
    void _toIdle();
    void _toSleeping();
};
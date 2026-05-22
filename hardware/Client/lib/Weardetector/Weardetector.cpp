#include "Weardetector.h"

#define MPU_REG_MOT_THR         0x1F
#define MPU_REG_MOT_DUR         0x20
#define MPU_REG_INT_PIN_CFG     0x37
#define MPU_REG_INT_ENABLE      0x38
#define MPU_REG_INT_STATUS      0x3A
#define MPU_REG_MOT_DETECT_CTRL 0x69
#define INT_EN_MOT_EN           (1 << 6)

// ─────────────────────────────────────────────────────────────────────────────

WearDetector::WearDetector(MPU6050 &imu, int intPin)
    : _imu(imu),
      _intPin(intPin),
      _state(WearState::ACTIVE),
      _lastSampleMs(0),
      _lastMotionMs(0),
      _movingCount(0),
      _stillCount(0)
{}

// ─────────────────────────────────────────────────────────────────────────────

void WearDetector::begin()
{
    if (_intPin >= 0) pinMode(_intPin, INPUT);
    _configureMotionInterrupt();

    _lastMotionMs = millis();
    _lastSampleMs = millis();
    _movingCount  = 0;
    _stillCount   = 0;
    _state        = WearState::ACTIVE;

    //Serial.println("[Wear] Detector ready.");
}

// ─────────────────────────────────────────────────────────────────────────────

WearState WearDetector::update()
{
    unsigned long now = millis();

    if (now - _lastSampleMs < WEAR_SAMPLE_INTERVAL_MS) return _state;
    _lastSampleMs = now;

    float delta   = _accelDelta();
    bool  aboveThr = (delta > WEAR_ACCEL_THRESHOLD_G);

    // Update rolling counters — each resets when the opposite condition is seen
    if (aboveThr) {
        _movingCount = (_movingCount < 255) ? _movingCount + 1 : 255;
        _stillCount  = 0;
    } else {
        _stillCount  = (_stillCount  < 255) ? _stillCount  + 1 : 255;
        _movingCount = 0;
    }

    // Confirmed movement = N consecutive above-threshold samples
    bool confirmedMoving = (_movingCount >= WEAR_CONFIRM_SAMPLES);

    // Confirmed stillness = N consecutive below-threshold samples
    bool confirmedStill  = (_stillCount  >= WEAR_STILL_CONFIRM_SAMPLES);

    switch (_state) {

    case WearState::ACTIVE:
        if (confirmedMoving) {
            _lastMotionMs = now;            // keep resetting while clearly moving
        }
        if (confirmedStill) {
            _toIdle();
        }
        break;

    case WearState::IDLE:
        if (confirmedMoving) {
            _lastMotionMs = now;
            _toActive();
        } else if (now - _lastMotionMs >= WEAR_IDLE_TIMEOUT_MS) {
            _toSleeping();
        }
        break;

case WearState::SLEEPING:
        // ── FIX 2: NEVER wake on a bare digitalRead alone. ────────────────
        // The INT pin is latched-high mode — one stale read causes instant
        // wake. Require confirmed software movement AND then optionally
        // use the INT pin as a secondary gate (both must agree).
        if (confirmedMoving) {
            // Only clear INT after we are already confident of real motion
            _clearIMUInterrupt();
            _movingCount  = 0;
            _stillCount   = 0;
            _lastMotionMs = now;
            _toActive();
        }
        break;
    }

    return _state;
}

// ─────────────────────────────────────────────────────────────────────────────

uint32_t WearDetector::idleRemainingMs() const
{
    if (_state != WearState::IDLE) return 0;
    unsigned long elapsed = millis() - _lastMotionMs;
    if (elapsed >= WEAR_IDLE_TIMEOUT_MS) return 0;
    return (uint32_t)(WEAR_IDLE_TIMEOUT_MS - elapsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

float WearDetector::_accelDelta()
{
    ImuData d;
    if (!_imu.read(d)) {
        //Serial.println("[IMU] read error");
        return 0.0f;
    }

    float mag   = sqrtf(d.ax * d.ax + d.ay * d.ay + d.az * d.az);
    float delta = fabsf(mag - 1.0f);

    //Serial.printf("[IMU] ax:%7.4f  ay:%7.4f  az:%7.4f  mag:%7.4f  delta:%7.4f  thr:%.4f  [%s]  mov:%d  still:%d\n",
                  //d.ax, d.ay, d.az,
                  //mag, delta,
                  //(float)WEAR_ACCEL_THRESHOLD_G,
                  //delta > WEAR_ACCEL_THRESHOLD_G ? "ABOVE" : "below",
                  //_movingCount, _stillCount);

    return delta;
}

// ─────────────────────────────────────────────────────────────────────────────

void WearDetector::_configureMotionInterrupt()
{
    auto writeIMU = [](uint8_t reg, uint8_t val) {
        Wire.beginTransmission(MPU6050_ADDR);
        Wire.write(reg);
        Wire.write(val);
        Wire.endTransmission();
    };

    writeIMU(MPU_REG_MOT_THR,         (uint8_t)MPU_MOT_THRESHOLD);
    writeIMU(MPU_REG_MOT_DUR,         (uint8_t)MPU_MOT_DURATION);
    writeIMU(MPU_REG_INT_PIN_CFG,     0x20);
    writeIMU(MPU_REG_INT_ENABLE,      INT_EN_MOT_EN);
    writeIMU(MPU_REG_MOT_DETECT_CTRL, 0x15);

    _clearIMUInterrupt();

    //Serial.printf("[Wear] Motion interrupt configured (thr=%d, dur=%d)\n",
                  //MPU_MOT_THRESHOLD, MPU_MOT_DURATION);
}

// ─────────────────────────────────────────────────────────────────────────────

void WearDetector::_clearIMUInterrupt()
{
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(MPU_REG_INT_STATUS);
    Wire.endTransmission(false);
    Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)1);
    if (Wire.available()) Wire.read();
}

// ─────────────────────────────────────────────────────────────────────────────

void WearDetector::_toActive()
{
    if (_state != WearState::ACTIVE) {
        //Serial.println("[Wear] → ACTIVE");
        _state = WearState::ACTIVE;
    }
}

void WearDetector::_toIdle()
{
    if (_state != WearState::IDLE) {
        //Serial.printf("[Wear] → IDLE (sleeping in %lu s)\n",
                      //WEAR_IDLE_TIMEOUT_MS / 1000UL);
        _state = WearState::IDLE;
    }
}

void WearDetector::_toSleeping()
{
    //Serial.println("[Wear] → SLEEPING (application idle, BLE active)");

    // ── FIX 1: Clear the latched INT pin BEFORE we start checking it ──────
    _clearIMUInterrupt();

    _movingCount = 0;
    _stillCount  = 0;
    _state       = WearState::SLEEPING;
}
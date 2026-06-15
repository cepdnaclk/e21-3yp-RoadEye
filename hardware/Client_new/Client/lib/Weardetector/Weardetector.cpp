#include "Weardetector.h"

WearDetector::WearDetector(MPU6050 &imu, int intPin)
    : _imu(imu),
      _intPin(intPin),
      _state(WearState::ACTIVE),
      _lastSampleMs(0),
      _movingCount(0),
      _stillCount(0)
{}

void WearDetector::begin()
{
    if (_intPin >= 0) pinMode(_intPin, INPUT);

    _lastSampleMs = millis();
    _movingCount  = 0;
    _stillCount   = 0;
    _state        = WearState::ACTIVE;
}

WearState WearDetector::update()
{
    unsigned long now = millis();

    if (now - _lastSampleMs < WEAR_SAMPLE_INTERVAL_MS) return _state;
    _lastSampleMs = now;

    float delta    = _accelDelta();
    bool  aboveThr = (delta > WEAR_ACCEL_THRESHOLD_G);

    if (aboveThr) {
        _movingCount = (_movingCount < 255) ? _movingCount + 1 : 255;
        _stillCount  = 0;
    } else {
        _stillCount  = (_stillCount  < 255) ? _stillCount  + 1 : 255;
        _movingCount = 0;
    }

    bool confirmedMoving = (_movingCount >= WEAR_CONFIRM_SAMPLES);
    bool confirmedStill  = (_stillCount  >= WEAR_STILL_CONFIRM_SAMPLES);

    switch (_state) {
    case WearState::ACTIVE:
        if (confirmedStill)  _toIdle();
        break;
    case WearState::IDLE:
        if (confirmedMoving) _toActive();
        break;
    }

    return _state;
}

float WearDetector::_accelDelta()
{
    ImuData d;
    if (!_imu.read(d)) return 0.0f;

    float mag = sqrtf(d.ax * d.ax + d.ay * d.ay + d.az * d.az);
    return fabsf(mag - 1.0f);
}

void WearDetector::_toActive()
{
    _state = WearState::ACTIVE;
}

void WearDetector::_toIdle()
{
    _state = WearState::IDLE;
}
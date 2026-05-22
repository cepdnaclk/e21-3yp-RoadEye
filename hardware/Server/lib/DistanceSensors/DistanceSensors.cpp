#include "DistanceSensors.h"

// ============================================================
// UltrasonicSensor
// ============================================================

UltrasonicSensor::UltrasonicSensor(uint8_t trigPin, uint8_t echoPin,
                                   float maxRangeCm, uint8_t trigPulseUs)
    : _trig(trigPin),
      _echo(echoPin),
      _maxRangeCm(maxRangeCm),
      _trigPulseUs(trigPulseUs),
      _timeoutUs(distTimeoutUs(maxRangeCm)) {}

void UltrasonicSensor::begin() {
    pinMode(_trig, OUTPUT);
    pinMode(_echo, INPUT);
    digitalWrite(_trig, LOW);
}

float UltrasonicSensor::readCm() {
    // Ensure TRIG starts LOW for a clean rising edge
    digitalWrite(_trig, LOW);
    delayMicroseconds(2);

    // Send trigger pulse — 20 µs for JSN-SR04T-3.0, 10 µs for HC-SR04
    digitalWrite(_trig, HIGH);
    delayMicroseconds(_trigPulseUs);
    digitalWrite(_trig, LOW);

    // Measure ECHO pulse width; timeout sized to this sensor's max range
    unsigned long duration = pulseIn(_echo, HIGH, _timeoutUs);

    if (duration == 0) {
        return _maxRangeCm;  // timeout = no obstacle in range
    }

    float distanceCm = (duration * SOUND_SPEED_CM_US) / 2.0f;

    if (distanceCm > _maxRangeCm) {
        distanceCm = _maxRangeCm;
    }

    return distanceCm;
}


// ============================================================
// JSNSensorUART
// ============================================================

JSNSensorUART::JSNSensorUART(HardwareSerial& serial)
    : _serial(serial), _mode(AUTO) {}

void JSNSensorUART::begin(Mode mode, unsigned long baud) {
    _mode = mode;
    _serial.begin(baud);
}

void JSNSensorUART::request() {
    // Mode 3 only: send trigger byte 0x55 to the sensor's RX pin
    if (_mode == TRIGGERED) {
        _serial.write(0x55);
    }
}

float JSNSensorUART::readCm() {
    // Drain available bytes and parse 3-byte packets: [0xFF][Hi][Lo]
    while (_serial.available()) {
        uint8_t byte = _serial.read();

        if (_bufIdx == 0) {
            // Wait for the start byte
            if (byte != 0xFF) continue;
        }

        _buf[_bufIdx++] = byte;

        if (_bufIdx == 3) {
            _bufIdx = 0;  // reset for next packet

            uint16_t distMm = ((uint16_t)_buf[1] << 8) | _buf[2];

            // Sensor outputs 0 when no echo / out of range
            if (distMm == 0) {
                _lastCm = DIST_MAX_CM_JSN;
            } else {
                _lastCm = distMm / 10.0f;  // mm → cm
                if (_lastCm > DIST_MAX_CM_JSN) _lastCm = DIST_MAX_CM_JSN;
            }
        }
    }

    return _lastCm;
}


// ============================================================
// DistanceSensors
// ============================================================

DistanceSensors::DistanceSensors(uint8_t rearTrig,  uint8_t rearEcho,
                                 uint8_t leftTrig,  uint8_t leftEcho,
                                 uint8_t rightTrig, uint8_t rightEcho)
    : _rearSensor (rearTrig,   rearEcho,  DIST_MAX_CM_JSN,    TRIG_PULSE_US_JSN),
      _leftSensor (leftTrig,   leftEcho,  DIST_MAX_CM_HCSR04, TRIG_PULSE_US_HCSR04),
      _rightSensor(rightTrig,  rightEcho, DIST_MAX_CM_HCSR04, TRIG_PULSE_US_HCSR04),
      // Seed each filter to its sensor's rated max range so the first
      // real reading converges from a sensible starting point.
      _rearFilter (DIST_MAX_CM_JSN),
      _leftFilter (DIST_MAX_CM_HCSR04),
      _rightFilter(DIST_MAX_CM_HCSR04)
{}

void DistanceSensors::begin() {
    _rearSensor.begin();
    _leftSensor.begin();
    _rightSensor.begin();
}

void DistanceSensors::update() {
    // Read raw, push through median+EMA filter, cache filtered result.
    _rearFilter.push(_rearSensor.readCm());
    _rear = _rearFilter.value();
    delay(DIST_INTER_SENSOR_DELAY_MS);

    _leftFilter.push(_leftSensor.readCm());
    _left = _leftFilter.value();
    delay(DIST_INTER_SENSOR_DELAY_MS);

    _rightFilter.push(_rightSensor.readCm());
    _right = _rightFilter.value();
}
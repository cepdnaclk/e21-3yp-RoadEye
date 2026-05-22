#pragma once

#include <Arduino.h>
#include <algorithm>   // std::sort

// Speed of sound at ~20 °C in cm/µs
static constexpr float SOUND_SPEED_CM_US = 0.03434f;

// Per-sensor maximum range constants (cm)
static constexpr float DIST_MAX_CM_HCSR04 = 400.0f;   // HC-SR04
static constexpr float DIST_MAX_CM_JSN    = 600.0f;   // JSN-SR04T-3.0

// Trigger pulse widths (µs)
// HC-SR04 works with 10 µs; JSN-SR04T-3.0 requires at least 20 µs.
static constexpr uint8_t TRIG_PULSE_US_HCSR04 = 10;
static constexpr uint8_t TRIG_PULSE_US_JSN    = 20;

// ============================================================
// Filter tuning
// ============================================================

// Number of raw samples kept for the median stage.
// Must be odd; larger = stronger spike rejection, more RAM.
// 3 gives faster response than 5 while still rejecting single-sample spikes.
static constexpr uint8_t  FILTER_MEDIAN_WINDOW = 3;

// --- Adaptive EMA thresholds ---
//
// The filter uses a piecewise-linear alpha that scales with how far the
// incoming median is from the current EMA output:
//
//   |delta| <= NEAR  → α = ALPHA_SLOW   (heavy smoothing, quiet noise)
//   |delta| >= FAR   → α = ALPHA_FAST   (near pass-through, real obstacle)
//   between          → α interpolated linearly
//
// Tune NEAR/FAR to match the typical noise band of your sensors.
// E.g. if sensors jitter ±3 cm at rest, set NEAR = 5 cm.

static constexpr float FILTER_ALPHA_SLOW   = 0.15f;  // noise band  – smooth heavily
static constexpr float FILTER_ALPHA_FAST   = 0.90f;  // big change  – near pass-through
static constexpr float FILTER_DELTA_NEAR   = 5.0f;   // cm — below this → ALPHA_SLOW
static constexpr float FILTER_DELTA_FAR    = 30.0f;  // cm — above this → ALPHA_FAST

/**
 * Compute the pulseIn timeout (µs) for a given max range in cm.
 * timeout = round-trip distance / speed_of_sound
 */
inline unsigned long distTimeoutUs(float maxRangeCm) {
    return static_cast<unsigned long>((maxRangeCm * 2.0f) / SOUND_SPEED_CM_US) + 100UL;
}


// ============================================================
// SensorFilter — median pre-filter + adaptive EMA smoother
//
// Call push(rawCm) after each raw reading.
// Call value() to get the latest filtered result.
//
// Pipeline:
//   raw sample → circular median window → adaptive EMA output
//
// The median stage (window = 3) rejects single-sample spikes such as
// false echoes and 0-readings, while adding only one sample of lag
// (vs. two for a window of 5).
//
// The adaptive EMA stage scales its smoothing factor α dynamically:
//   - Small delta from current output → low α (heavy smoothing, kills noise)
//   - Large delta from current output → high α (fast tracking, real obstacle)
//
// This gives consistent, low-noise readings at steady state AND
// near-instant response when an obstacle genuinely appears or moves.
//
// The filter is seeded with maxRangeCm so that the first real
// reading converges quickly rather than starting from 0.
// ============================================================

class SensorFilter {
public:
    /**
     * @param maxRangeCm  Used as the seed value before any readings arrive.
     */
    explicit SensorFilter(float maxRangeCm = DIST_MAX_CM_HCSR04)
        : _ema(maxRangeCm), _seeded(false)
    {
        for (uint8_t i = 0; i < FILTER_MEDIAN_WINDOW; ++i) {
            _window[i] = maxRangeCm;
        }
    }

    /**
     * @brief  Ingest one raw cm reading and update the filtered output.
     * @param  rawCm  Fresh reading from the sensor.
     */
    void push(float rawCm) {
        // --- 1. Circular median window ---
        _window[_head] = rawCm;
        _head = (_head + 1) % FILTER_MEDIAN_WINDOW;

        // Copy window, sort, pick middle element
        float sorted[FILTER_MEDIAN_WINDOW];
        for (uint8_t i = 0; i < FILTER_MEDIAN_WINDOW; ++i) {
            sorted[i] = _window[i];
        }
        std::sort(sorted, sorted + FILTER_MEDIAN_WINDOW);
        float median = sorted[FILTER_MEDIAN_WINDOW / 2];

        // --- 2. Adaptive EMA on the median output ---
        if (!_seeded) {
            // Seed EMA with the first real median to avoid a long
            // ramp-up from the initial maxRange seed value.
            _ema    = median;
            _seeded = true;
            return;
        }

        // Compute how far the new median is from the current filtered value.
        float delta = fabsf(median - _ema);

        // Scale alpha linearly between ALPHA_SLOW and ALPHA_FAST based on delta.
        float alpha;
        if (delta <= FILTER_DELTA_NEAR) {
            alpha = FILTER_ALPHA_SLOW;
        } else if (delta >= FILTER_DELTA_FAR) {
            alpha = FILTER_ALPHA_FAST;
        } else {
            // Linear interpolation between slow and fast
            float t = (delta - FILTER_DELTA_NEAR) /
                      (FILTER_DELTA_FAR - FILTER_DELTA_NEAR);
            alpha = FILTER_ALPHA_SLOW + t * (FILTER_ALPHA_FAST - FILTER_ALPHA_SLOW);
        }

        _ema = alpha * median + (1.0f - alpha) * _ema;
    }

    /** @return Latest filtered distance in cm. */
    float value() const { return _ema; }

    /** Reset the filter to the given seed value (e.g. on re-init). */
    void reset(float seedCm) {
        for (uint8_t i = 0; i < FILTER_MEDIAN_WINDOW; ++i) {
            _window[i] = seedCm;
        }
        _ema    = seedCm;
        _head   = 0;
        _seeded = false;
    }

private:
    float   _window[FILTER_MEDIAN_WINDOW];
    uint8_t _head   = 0;
    float   _ema;
    bool    _seeded;
};


// ============================================================
// UltrasonicSensor  — trigger/echo (pulse) mode
// Works for HC-SR04 and JSN-SR04T-3.0 in Mode 0 (default,
// no resistor fitted on the MODE pads).
// ============================================================

/**
 * @brief A single ultrasonic sensor in standard trigger/echo mode.
 *
 * Usage:
 *   UltrasonicSensor rear(TRIG_PIN, ECHO_PIN,
 *                         DIST_MAX_CM_JSN, TRIG_PULSE_US_JSN);
 *   rear.begin();
 *   float cm = rear.readCm();   // returns raw, unfiltered distance
 */
class UltrasonicSensor {
public:
    UltrasonicSensor(uint8_t trigPin, uint8_t echoPin,
                     float   maxRangeCm   = DIST_MAX_CM_HCSR04,
                     uint8_t trigPulseUs  = TRIG_PULSE_US_HCSR04);

    void  begin();

    /** Fire one measurement and return the raw distance in cm. */
    float readCm();

    float maxRange() const { return _maxRangeCm; }

private:
    uint8_t       _trig;
    uint8_t       _echo;
    float         _maxRangeCm;
    uint8_t       _trigPulseUs;
    unsigned long _timeoutUs;
};


// ============================================================
// JSNSensorUART  — UART mode for JSN-SR04T-3.0
// ============================================================

class JSNSensorUART {
public:
    enum Mode { AUTO = 2, TRIGGERED = 3 };

    explicit JSNSensorUART(HardwareSerial& serial);

    void begin(Mode mode = AUTO, unsigned long baud = 9600);
    void request();
    float readCm();

private:
    HardwareSerial& _serial;
    Mode            _mode;

    uint8_t  _buf[3];
    uint8_t  _bufIdx = 0;

    float    _lastCm = DIST_MAX_CM_JSN;
};


// ============================================================
// DistanceSensors  — convenience wrapper (trigger/echo mode)
// ============================================================

class DistanceSensors {
public:
    DistanceSensors(uint8_t rearTrig, uint8_t rearEcho,
                    uint8_t leftTrig, uint8_t leftEcho,
                    uint8_t rightTrig, uint8_t rightEcho);

    void begin();

    /**
     * Fire all three sensors sequentially, push raw readings through
     * their individual filters, and cache the filtered results.
     *
     * Worst-case blocking time:
     *   Rear  (JSN, 600 cm, 20 µs pulse) : ~35 ms
     *   Left  (HC-SR04, 400 cm)           : ~24 ms
     *   Right (HC-SR04, 400 cm)           : ~24 ms
     *   Total                             : ~83 ms + 2×5 ms inter-sensor delay
     */
    void update();

    /** Filtered distance in cm (rear JSN-SR04T-3.0, max 600 cm). */
    float getRear()  const { return _rear;  }
    /** Filtered distance in cm (left HC-SR04, max 400 cm). */
    float getLeft()  const { return _left;  }
    /** Filtered distance in cm (right HC-SR04, max 400 cm). */
    float getRight() const { return _right; }

    /** Raw (unfiltered) readings — useful for diagnostics. */
    float readRearRaw()  { return _rearSensor.readCm();  }
    float readLeftRaw()  { return _leftSensor.readCm();  }
    float readRightRaw() { return _rightSensor.readCm(); }

private:
    UltrasonicSensor _rearSensor;
    UltrasonicSensor _leftSensor;
    UltrasonicSensor _rightSensor;

    SensorFilter _rearFilter;
    SensorFilter _leftFilter;
    SensorFilter _rightFilter;

    float _rear  = DIST_MAX_CM_JSN;
    float _left  = DIST_MAX_CM_HCSR04;
    float _right = DIST_MAX_CM_HCSR04;

    // Reduced from 10 ms → 5 ms; sensors need ~2–3 ms to settle between
    // firings. 5 ms gives a comfortable margin without unnecessary lag.
    static constexpr uint8_t DIST_INTER_SENSOR_DELAY_MS = 5;
};
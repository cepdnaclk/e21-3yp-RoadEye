#pragma once
#include <Arduino.h>

class IMUFilter {
public:
    void begin(float beta = 0.1f);
    void update(float gx, float gy, float gz,
                float ax, float ay, float az,
                float dt);

    float getRoll();
    float getPitch();

    // IMUFilter.h — add inside the class:
    float getQ0() { return q0; }
    float getQ1() { return q1; }
    float getQ2() { return q2; }
    float getQ3() { return q3; }

private:
    float beta; // filter gain

    // quaternion
    float q0 = 1.0f, q1 = 0.0f, q2 = 0.0f, q3 = 0.0f;

    float invSqrt(float x);
};
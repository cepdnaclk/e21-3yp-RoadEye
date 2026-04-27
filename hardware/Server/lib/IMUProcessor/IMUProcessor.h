#pragma once
#include <Arduino.h>
#include <MPU6050.h>
#include <IMUFilter.h>

struct IMUData {
    float roll;
    float pitch;
    float forwardAccel;
    float vibration;
    bool isRiding;
};

class IMUProcessor {
public:
    void begin();
    void update();
    IMUData getData();

private:
    MPU6050 mpu;

    IMUFilter filter;

    // Mahony filter state
    float roll = 0.0f;
    float pitch = 0.0f;

    float twoKp = 2.0f * 0.2f;   // proportional gain
    float twoKi = 2.0f * 0.002f;   // integral gain (kept 0 for now)

    float integralFBx = 0;
    float integralFBy = 0;
    float integralFBz = 0;

    float q0 = 1, q1 = 0, q2 = 0, q3 = 0; // quaternion

    float forwardAccel = 0;
    float vibration = 0;
    bool isRiding = false;

    float prev_ax = 0, prev_ay = 0, prev_az = 0;

    unsigned long lastUpdate = 0;

    const float VIB_IMU_THRESHOLD = 0.15;

    void mahonyUpdate(float gx, float gy, float gz,
                      float ax, float ay, float az,
                      float dt);
};
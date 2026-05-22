#include "IMUProcessor.h"
#include <Wire.h>
#include <math.h>

// ─────────────────────────────
// Gyro bias
// ─────────────────────────────
static float gyroBiasX = 0.0f;
static float gyroBiasY = 0.0f;
static float gyroBiasZ = 0.0f;

void IMUProcessor::begin() {
    Wire.begin(21, 22);
    mpu.initialize();
    delay(200);

    int attempts = 0;
    while (!mpu.testConnection() && attempts < 10) {
        Serial.println("Retrying MPU...");
        delay(200);
        attempts++;
    }

    if (!mpu.testConnection()) {
        Serial.println("MPU INIT FAILED - check wiring!");
    } else {
        Serial.println("MPU connected");
    }

    // ─────────────────────────────
    // Gyro calibration (keep bike still)
    // ─────────────────────────────
    Serial.println("Calibrating gyro... keep device still");

    const int samples = 500;
    float sumX = 0, sumY = 0, sumZ = 0;

    for (int i = 0; i < samples; i++) {
        int16_t ax, ay, az, gx, gy, gz;
        mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
        sumX += gx;
        sumY += gy;
        sumZ += gz;
        delay(5);
    }

    gyroBiasX = sumX / samples;
    gyroBiasY = sumY / samples;
    gyroBiasZ = sumZ / samples;

    Serial.println("Gyro calibration done");

    filter.begin(0.08f);
    lastUpdate = micros();
}

void IMUProcessor::update() {

    // ─────────────────────────────
    // Time step
    // ─────────────────────────────
    unsigned long now = micros();
    float dt = (now - lastUpdate) / 1000000.0f;
    lastUpdate = now;

    if (dt <= 0.0f || dt > 0.1f) dt = 0.01f;

    // ─────────────────────────────
    // Read sensor
    // ─────────────────────────────
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    float raw_ax = ax / 16384.0f;   // in g
    float raw_ay = ay / 16384.0f;
    float raw_az = az / 16384.0f;

    float gyro_x = (gx - gyroBiasX) * (PI / 180.0f) / 131.0f;  // rad/s
    float gyro_y = (gy - gyroBiasY) * (PI / 180.0f) / 131.0f;
    float gyro_z = (gz - gyroBiasZ) * (PI / 180.0f) / 131.0f;

    // ─────────────────────────────
    // Madgwick update
    // ─────────────────────────────
    filter.update(gyro_x, gyro_y, gyro_z,
                  raw_ax, raw_ay, raw_az,
                  dt);

    roll  = filter.getRoll();
    pitch = filter.getPitch();

    // ─────────────────────────────────────────────────────────────────
    // Full quaternion gravity compensation
    //
    // The Madgwick filter internally maintains a quaternion q = [q0,q1,q2,q3]
    // that describes the rotation from sensor frame → world frame.
    //
    // The gravity vector in the world frame is [0, 0, 1] (pointing down in g).
    // We rotate it back into the sensor frame using the conjugate quaternion,
    // giving us exactly what the accelerometer "sees" due to gravity alone.
    // Subtracting that from the raw reading leaves only linear acceleration.
    //
    // This works correctly for ANY physical mounting orientation of the IMU.
    // ─────────────────────────────────────────────────────────────────
    float q0 = filter.getQ0();
    float q1 = filter.getQ1();
    float q2 = filter.getQ2();
    float q3 = filter.getQ3();

    // Gravity vector expressed in sensor frame (rotate world [0,0,1] by q*)
    // Derived from the 3rd column of the rotation matrix R = q_to_R(q):
    float grav_x =   2.0f * (q1*q3 - q0*q2);
    float grav_y =   2.0f * (q0*q1 + q2*q3);
    float grav_z =   q0*q0 - q1*q1 - q2*q2 + q3*q3;

    // Remove gravity → pure linear acceleration in sensor frame (in g)
    float lin_ax = raw_ax - grav_x;
    float lin_ay = raw_ay - grav_y;
    float lin_az = raw_az - grav_z;

    // Rotate linear acceleration into world frame
    // Using R * v where R is the rotation matrix from q:
    float world_ax = (1 - 2*(q2*q2 + q3*q3)) * lin_ax
                   + 2*(q1*q2 - q0*q3)        * lin_ay
                   + 2*(q1*q3 + q0*q2)        * lin_az;

    float world_ay = 2*(q1*q2 + q0*q3)        * lin_ax
                   + (1 - 2*(q1*q1 + q3*q3))  * lin_ay
                   + 2*(q2*q3 - q0*q1)        * lin_az;

    float world_az = 2*(q1*q3 - q0*q2)        * lin_ax
                   + 2*(q2*q3 + q0*q1)        * lin_ay
                   + (1 - 2*(q1*q1 + q2*q2))  * lin_az;

    // world_ax = forward/braking acceleration (bike's travel direction)
    // world_ay = lateral (lean-induced, small on a bike)
    // world_az = vertical (bumps, suspension)
    forwardAccel = world_ax;

    // ─────────────────────────────
    // Vibration detection (smoothed)
    // ─────────────────────────────
    float vibInstant =
        fabs(raw_ax - prev_ax) +
        fabs(raw_ay - prev_ay) +
        fabs(raw_az - prev_az);

    vibration = vibration * 0.9f + vibInstant * 0.1f;

    prev_ax = raw_ax;
    prev_ay = raw_ay;
    prev_az = raw_az;

    isRiding = (vibration > VIB_IMU_THRESHOLD);
}

IMUData IMUProcessor::getData() {
    IMUData d;
    d.roll         = roll  * 180.0f / PI;
    d.pitch        = pitch * 180.0f / PI;
    d.forwardAccel = forwardAccel;   // in g, gravity-free, orientation-free
    d.vibration    = vibration;
    d.isRiding     = isRiding;
    return d;
}
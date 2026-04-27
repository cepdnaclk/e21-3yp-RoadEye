#pragma once
#include <stdint.h>

#pragma pack(push, 1)
struct SensorData {
    float forwardAccel;
    float roll;
    float vibration;
    uint8_t isRiding;

    float temperature;
    float humidity;

    float distRear;     // JSN-SR04T-3.0 (rear)  — range 0–600 cm
    float distLeft;     // HC-SR04        (left)  — range 0–400 cm
    float distRight;    // HC-SR04        (right) — range 0–400 cm
};
#pragma pack(pop)
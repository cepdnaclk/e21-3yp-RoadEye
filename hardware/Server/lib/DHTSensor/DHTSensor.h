#pragma once

#include <Arduino.h>
#include <DHT.h>

class DHTSensor {
public:
    void begin(uint8_t pin);

    void update();  // call frequently, internally rate-limited

    float getTemperature() const;
    float getHumidity() const;

private:
    DHT* dht = nullptr;

    float temperature = 0;
    float humidity = 0;

    unsigned long lastRead = 0;
    const unsigned long interval = 2000; // 2 seconds
};
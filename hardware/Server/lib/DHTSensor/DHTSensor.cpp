#include "DHTSensor.h"

#define DHT_TYPE DHT22

void DHTSensor::begin(uint8_t pin) {
    dht = new DHT(pin, DHT_TYPE);
    dht->begin();
}

void DHTSensor::update() {
    unsigned long now = millis();

    if (now - lastRead < interval) return;

    lastRead = now;

    float h = dht->readHumidity();
    float t = dht->readTemperature();

    // Only update if valid
    if (!isnan(h) && !isnan(t)) {
        humidity = h;
        temperature = t;
    }
}

float DHTSensor::getTemperature() const {
    return temperature;
}

float DHTSensor::getHumidity() const {
    return humidity;
}
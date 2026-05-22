#pragma once

#include <NimBLEDevice.h>
#include "SensorData.h"

class SensorBLEServer {
public:
    void begin(const char* deviceName);
    void send(const SensorData& data);
    bool isConnected();

private:
    NimBLECharacteristic* pCharacteristic = nullptr;
    bool deviceConnected = false;

    class ServerCallbacks : public NimBLEServerCallbacks {
    public:
        ServerCallbacks(SensorBLEServer* parent) : _parent(parent) {}
        void onConnect(NimBLEServer* pServer) override;
        void onDisconnect(NimBLEServer* pServer) override;

    private:
        SensorBLEServer* _parent;
    };
};
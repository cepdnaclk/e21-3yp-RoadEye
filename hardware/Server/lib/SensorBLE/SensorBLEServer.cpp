#include "SensorBLEServer.h"

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcd1234-ab12-ab12-ab12-abcdef123456"

// ─────────────────────────────
// Callbacks
// ─────────────────────────────
void SensorBLEServer::ServerCallbacks::onConnect(NimBLEServer* pServer) {
    _parent->deviceConnected = true;
}

void SensorBLEServer::ServerCallbacks::onDisconnect(NimBLEServer* pServer) {
    _parent->deviceConnected = false;
    NimBLEDevice::startAdvertising();
}

// ─────────────────────────────
// Public API
// ─────────────────────────────
void SensorBLEServer::begin(const char* deviceName) {
    NimBLEDevice::init(deviceName);

    NimBLEServer* pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks(this));

    NimBLEService* pService = pServer->createService(SERVICE_UUID);

    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );

    pService->start();

    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();
}

void SensorBLEServer::send(const SensorData& data) {
    if (!deviceConnected || pCharacteristic == nullptr) return;

    pCharacteristic->setValue((uint8_t*)&data, sizeof(data));
    pCharacteristic->notify();
}

bool SensorBLEServer::isConnected() {
    return deviceConnected;
}
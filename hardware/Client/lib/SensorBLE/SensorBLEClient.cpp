#include "SensorBLEClient.h"

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcd1234-ab12-ab12-ab12-abcdef123456"

SensorBLEClient* SensorBLEClient::instance = nullptr;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

void SensorBLEClient::begin()
{
    instance = this;

    NimBLEDevice::init("");

    // NimBLE automatically duty-cycles the radio between connection events
    // (BLE modem sleep). No extra configuration needed — it's on by default.

    _startScan();
}

void SensorBLEClient::loop()
{
    // ── Handle a clean disconnect ─────────────────────────────────────────────
    // onDisconnect() runs in the NimBLE task, so we use a flag and handle it
    // here in the Arduino loop to avoid race conditions.
    if (_disconnected) {
        _disconnected = false;
        _connected    = false;
        _doConnect    = false;
        _advDevice    = nullptr;

        // Destroy the old client so NimBLE frees its resources
        if (_pClient) {
            NimBLEDevice::deleteClient(_pClient);
            _pClient = nullptr;
        }

        _disconnectTime = millis();
        Serial.println("[BLE] Disconnected — will rescan in "
                       + String(BLE_RECONNECT_DELAY_MS) + " ms");
    }

    // ── Reconnect delay then rescan ───────────────────────────────────────────
    if (!_connected && !_doConnect && !isScanning()) {
        if (_disconnectTime == 0 || millis() - _disconnectTime >= BLE_RECONNECT_DELAY_MS) {
            _startScan();
        }
    }

    // ── Connect once scan finds the device ───────────────────────────────────
    if (_doConnect && !_connected) {
        _doConnect = false;
        _connected = _connectToServer();

        if (!_connected) {
            Serial.println("[BLE] Connection failed — will rescan.");
            _disconnectTime = millis();   // triggers rescan after delay
        }
    }
}

void SensorBLEClient::setCallback(void (*cb)(const SensorData&))
{
    _userCallback = cb;
}

bool SensorBLEClient::isScanning() const
{
    NimBLEScan* pScan = NimBLEDevice::getScan();
    return pScan && pScan->isScanning();
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

void SensorBLEClient::_startScan()
{
    //Serial.println("[BLE] Starting scan…");

    NimBLEScan* pScan = NimBLEDevice::getScan();
    pScan->setAdvertisedDeviceCallbacks(new AdvertisedDeviceCallbacks(this));
    pScan->setActiveScan(true);

    // Filter duplicates to reduce callback noise during continuous scan
    pScan->setDuplicateFilter(true);

    pScan->start(BLE_SCAN_DURATION_S, nullptr);
}

bool SensorBLEClient::_connectToServer()
{
    //Serial.println("[BLE] Connecting to server…");

    _pClient = NimBLEDevice::createClient();
    _pClient->setClientCallbacks(new ClientCallbacks(this),
                                 /*deleteCallbacks=*/true);

    // Set a reasonable connection timeout
    _pClient->setConnectTimeout(5);   // seconds

    if (!_pClient->connect(_advDevice)) {
        //Serial.println("[BLE] connect() failed.");
        NimBLEDevice::deleteClient(_pClient);
        _pClient = nullptr;
        return false;
    }

    //Serial.println("[BLE] Connected — discovering services…");

    NimBLERemoteService* pService = _pClient->getService(SERVICE_UUID);
    if (!pService) {
        //Serial.println("[BLE] Service not found.");
        _pClient->disconnect();
        return false;
    }

    _pRemoteCharacteristic = pService->getCharacteristic(CHARACTERISTIC_UUID);
    if (!_pRemoteCharacteristic) {
        //Serial.println("[BLE] Characteristic not found.");
        _pClient->disconnect();
        return false;
    }

    if (_pRemoteCharacteristic->canNotify()) {
        _pRemoteCharacteristic->subscribe(true, _notifyCallback);
        //Serial.println("[BLE] Subscribed to notifications.");
    } else {
        //Serial.println("[BLE] Warning: characteristic cannot notify.");
    }

    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification
// ─────────────────────────────────────────────────────────────────────────────

void SensorBLEClient::_notifyCallback(
    NimBLERemoteCharacteristic* /*c*/,
    uint8_t* data,
    size_t   length,
    bool     /*isNotify*/)
{
    if (instance) instance->_handleNotification(data, length);
}

void SensorBLEClient::_handleNotification(uint8_t* data, size_t length)
{
    if (length != sizeof(SensorData)) return;

    SensorData received;
    memcpy(&received, data, sizeof(SensorData));

    if (_userCallback) _userCallback(received);
}

// ─────────────────────────────────────────────────────────────────────────────
// AdvertisedDeviceCallbacks
// ─────────────────────────────────────────────────────────────────────────────

void SensorBLEClient::AdvertisedDeviceCallbacks::onResult(
    NimBLEAdvertisedDevice* advertisedDevice)
{
    if (advertisedDevice->isAdvertisingService(NimBLEUUID(SERVICE_UUID))) {
        //Serial.println("[BLE] Sensor peripheral found.");
        _parent->_advDevice = advertisedDevice;
        _parent->_doConnect = true;
        NimBLEDevice::getScan()->stop();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ClientCallbacks
// ─────────────────────────────────────────────────────────────────────────────

void SensorBLEClient::ClientCallbacks::onConnect(NimBLEClient* /*pClient*/)
{
    //Serial.println("[BLE] onConnect fired.");
    // _connected is set by _connectToServer() return value — no action needed here
}

void SensorBLEClient::ClientCallbacks::onDisconnect(NimBLEClient* /*pClient*/)
{
    // This runs in the NimBLE task context — only set a flag, don't do I/O work
    _parent->_disconnected = true;
}
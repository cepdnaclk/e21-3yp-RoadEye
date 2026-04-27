#pragma once

#include <NimBLEDevice.h>
#include "SensorData.h"

// ── Reconnect tuning ─────────────────────────────────────────────────────────

// How long to wait before starting a fresh scan after disconnect (ms)
#define BLE_RECONNECT_DELAY_MS   2000UL

// Active scan window — 0 = scan indefinitely until device found
#define BLE_SCAN_DURATION_S      0

// ─────────────────────────────────────────────────────────────────────────────

class SensorBLEClient {
public:

    /** Call once in setup(). Initialises NimBLE and starts the first scan. */
    void begin();

    /**
     * Call every loop iteration.
     * Drives the connect / reconnect state machine.
     */
    void loop();

    /** Register a callback to receive decoded SensorData packets. */
    void setCallback(void (*cb)(const SensorData&));

    // ── Status accessors ─────────────────────────────────────────────────────

    /** True while a GATT connection is established and notifications are live. */
    bool isConnected() const { return _connected; }

    /** True while actively scanning for the sensor peripheral. */
    bool isScanning() const;

private:

    // ── NimBLE objects ────────────────────────────────────────────────────────
    NimBLEClient*               _pClient                = nullptr;
    NimBLERemoteCharacteristic* _pRemoteCharacteristic  = nullptr;
    NimBLEAdvertisedDevice*     _advDevice              = nullptr;

    // ── State ─────────────────────────────────────────────────────────────────
    static SensorBLEClient* instance;

    volatile bool _doConnect       = false;   // set by scan callback, cleared after attempt
    volatile bool _connected       = false;   // set by connect(), cleared by onDisconnect()
    volatile bool _disconnected    = false;   // flag set in onDisconnect(), handled in loop()

    unsigned long _disconnectTime  = 0;       // millis() when disconnect was detected

    void (*_userCallback)(const SensorData&) = nullptr;

    // ── Scan / connect helpers ────────────────────────────────────────────────
    void _startScan();
    bool _connectToServer();

    // ── Notification handler ──────────────────────────────────────────────────
    void _handleNotification(uint8_t* data, size_t length);

    static void _notifyCallback(
        NimBLERemoteCharacteristic* c,
        uint8_t* data,
        size_t   length,
        bool     isNotify);

    // ── Inner callback classes ────────────────────────────────────────────────

    class AdvertisedDeviceCallbacks : public NimBLEAdvertisedDeviceCallbacks {
    public:
        explicit AdvertisedDeviceCallbacks(SensorBLEClient* parent) : _parent(parent) {}
        void onResult(NimBLEAdvertisedDevice* advertisedDevice) override;
    private:
        SensorBLEClient* _parent;
    };

    class ClientCallbacks : public NimBLEClientCallbacks {
    public:
        explicit ClientCallbacks(SensorBLEClient* parent) : _parent(parent) {}
        void onConnect(NimBLEClient* pClient)    override;
        void onDisconnect(NimBLEClient* pClient) override;
    private:
        SensorBLEClient* _parent;
    };
};
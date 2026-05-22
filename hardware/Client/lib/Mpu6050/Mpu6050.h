#pragma once

#include <Arduino.h>
#include <Wire.h>

// I2C Address (AD0 pin low = 0x68, AD0 pin high = 0x69)
#define MPU6050_ADDR        0x68

// Register map
#define MPU6050_REG_PWR_MGMT_1      0x6B
#define MPU6050_REG_SMPLRT_DIV      0x19
#define MPU6050_REG_CONFIG          0x1A
#define MPU6050_REG_GYRO_CONFIG     0x1B
#define MPU6050_REG_ACCEL_CONFIG    0x1C
#define MPU6050_REG_ACCEL_XOUT_H    0x3B
#define MPU6050_REG_TEMP_OUT_H      0x41
#define MPU6050_REG_GYRO_XOUT_H    0x43
#define MPU6050_REG_WHO_AM_I        0x75

// Accelerometer full-scale range
enum AccelRange {
    ACCEL_RANGE_2G  = 0x00,  // ±2g  — most sensitive
    ACCEL_RANGE_4G  = 0x08,  // ±4g
    ACCEL_RANGE_8G  = 0x10,  // ±8g
    ACCEL_RANGE_16G = 0x18   // ±16g — least sensitive
};

// Gyroscope full-scale range
enum GyroRange {
    GYRO_RANGE_250DPS  = 0x00,  // ±250 °/s  — most sensitive
    GYRO_RANGE_500DPS  = 0x08,  // ±500 °/s
    GYRO_RANGE_1000DPS = 0x10,  // ±1000 °/s
    GYRO_RANGE_2000DPS = 0x18   // ±2000 °/s — least sensitive
};

// Raw sensor data container
struct RawData {
    int16_t ax, ay, az;   // Accelerometer counts
    int16_t gx, gy, gz;   // Gyroscope counts
    int16_t temp;          // Temperature counts
};

// Scaled sensor data container
struct ImuData {
    float ax, ay, az;     // Acceleration  (g)
    float gx, gy, gz;     // Angular rate  (°/s)
    float tempC;           // Temperature   (°C)
};

class MPU6050 {
public:
    /**
     * @param sda     SDA GPIO pin  (default 33 for your wiring)
     * @param scl     SCL GPIO pin  (default 32 for your wiring)
     * @param addr    I2C address   (0x68 when AD0 is LOW)
     * @param freq    I2C clock Hz  (400000 = fast mode)
     */
    MPU6050(int sda = 33, int scl = 32,
            uint8_t addr = MPU6050_ADDR,
            uint32_t freq = 400000);

    /**
     * Initialise the sensor. Call once in setup().
     * @return true on success, false if the device is not found.
     */
    bool begin(AccelRange accelRange = ACCEL_RANGE_2G,
               GyroRange  gyroRange  = GYRO_RANGE_250DPS);

    /** Read raw 16-bit counts directly from registers. */
    bool readRaw(RawData &out);

    /**
     * Read and scale sensor data into physical units:
     *   acceleration → g
     *   angular rate → °/s
     *   temperature  → °C
     */
    bool read(ImuData &out);

    /** Change accelerometer range at runtime. */
    bool setAccelRange(AccelRange range);

    /** Change gyroscope range at runtime. */
    bool setGyroRange(GyroRange range);

    /** Return the WHO_AM_I register value (should be 0x68). */
    uint8_t whoAmI();

private:
    TwoWire  *_wire;
    uint8_t   _addr;
    int       _sda, _scl;
    uint32_t  _freq;

    AccelRange _accelRange;
    GyroRange  _gyroRange;

    // Scale factors derived from the chosen range
    float _accelScale;   // LSB/g  → convert to g
    float _gyroScale;    // LSB/(°/s) → convert to °/s

    void updateScales();

    bool  writeReg(uint8_t reg, uint8_t value);
    uint8_t readReg(uint8_t reg);
    bool  readRegs(uint8_t startReg, uint8_t *buf, uint8_t len);
};
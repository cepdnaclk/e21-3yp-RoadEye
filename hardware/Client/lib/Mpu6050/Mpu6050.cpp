#include "MPU6050.h"

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
MPU6050::MPU6050(int sda, int scl, uint8_t addr, uint32_t freq)
    : _sda(sda), _scl(scl), _addr(addr), _freq(freq),
      _accelRange(ACCEL_RANGE_2G), _gyroRange(GYRO_RANGE_250DPS),
      _accelScale(1.0f / 16384.0f), _gyroScale(1.0f / 131.0f)
{
    _wire = &Wire;
}

// ---------------------------------------------------------------------------
// begin()
// ---------------------------------------------------------------------------
bool MPU6050::begin(AccelRange accelRange, GyroRange gyroRange)
{
    _wire->begin(_sda, _scl, _freq);

    // Verify device identity
    if (whoAmI() != 0x68) {
        return false;
    }

    // Wake the chip: clear SLEEP bit in PWR_MGMT_1, use internal 8 MHz osc
    if (!writeReg(MPU6050_REG_PWR_MGMT_1, 0x00)) return false;

    // Apply user-selected ranges
    if (!setAccelRange(accelRange)) return false;
    if (!setGyroRange(gyroRange))   return false;

    return true;
}

// ---------------------------------------------------------------------------
// Range configuration
// ---------------------------------------------------------------------------
bool MPU6050::setAccelRange(AccelRange range)
{
    _accelRange = range;
    updateScales();
    return writeReg(MPU6050_REG_ACCEL_CONFIG, static_cast<uint8_t>(range));
}

bool MPU6050::setGyroRange(GyroRange range)
{
    _gyroRange = range;
    updateScales();
    return writeReg(MPU6050_REG_GYRO_CONFIG, static_cast<uint8_t>(range));
}

void MPU6050::updateScales()
{
    // Accelerometer: datasheet sensitivity (LSB/g)
    switch (_accelRange) {
        case ACCEL_RANGE_2G:  _accelScale = 1.0f / 16384.0f; break;
        case ACCEL_RANGE_4G:  _accelScale = 1.0f /  8192.0f; break;
        case ACCEL_RANGE_8G:  _accelScale = 1.0f /  4096.0f; break;
        case ACCEL_RANGE_16G: _accelScale = 1.0f /  2048.0f; break;
    }

    // Gyroscope: datasheet sensitivity (LSB / °/s)
    switch (_gyroRange) {
        case GYRO_RANGE_250DPS:  _gyroScale = 1.0f / 131.0f;  break;
        case GYRO_RANGE_500DPS:  _gyroScale = 1.0f /  65.5f;  break;
        case GYRO_RANGE_1000DPS: _gyroScale = 1.0f /  32.8f;  break;
        case GYRO_RANGE_2000DPS: _gyroScale = 1.0f /  16.4f;  break;
    }
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
bool MPU6050::readRaw(RawData &out)
{
    // Burst-read 14 bytes starting at ACCEL_XOUT_H
    // Layout: AX_H AX_L  AY_H AY_L  AZ_H AZ_L
    //         TEMP_H TEMP_L
    //         GX_H GX_L  GY_H GY_L  GZ_H GZ_L
    uint8_t buf[14];
    if (!readRegs(MPU6050_REG_ACCEL_XOUT_H, buf, 14)) return false;

    out.ax   = (int16_t)((buf[0]  << 8) | buf[1]);
    out.ay   = (int16_t)((buf[2]  << 8) | buf[3]);
    out.az   = (int16_t)((buf[4]  << 8) | buf[5]);
    out.temp = (int16_t)((buf[6]  << 8) | buf[7]);
    out.gx   = (int16_t)((buf[8]  << 8) | buf[9]);
    out.gy   = (int16_t)((buf[10] << 8) | buf[11]);
    out.gz   = (int16_t)((buf[12] << 8) | buf[13]);

    return true;
}

bool MPU6050::read(ImuData &out)
{
    RawData raw;
    if (!readRaw(raw)) return false;

    out.ax = raw.ax * _accelScale;
    out.ay = raw.ay * _accelScale;
    out.az = raw.az * _accelScale;

    out.gx = raw.gx * _gyroScale;
    out.gy = raw.gy * _gyroScale;
    out.gz = raw.gz * _gyroScale;

    // From datasheet: Temp(°C) = raw / 340.0 + 36.53
    out.tempC = raw.temp / 340.0f + 36.53f;

    return true;
}

// ---------------------------------------------------------------------------
// WHO_AM_I
// ---------------------------------------------------------------------------
uint8_t MPU6050::whoAmI()
{
    return readReg(MPU6050_REG_WHO_AM_I);
}

// ---------------------------------------------------------------------------
// Low-level I2C helpers
// ---------------------------------------------------------------------------
bool MPU6050::writeReg(uint8_t reg, uint8_t value)
{
    _wire->beginTransmission(_addr);
    _wire->write(reg);
    _wire->write(value);
    return (_wire->endTransmission() == 0);
}

uint8_t MPU6050::readReg(uint8_t reg)
{
    _wire->beginTransmission(_addr);
    _wire->write(reg);
    _wire->endTransmission(false);          // repeated start
    _wire->requestFrom(_addr, (uint8_t)1);
    return _wire->available() ? _wire->read() : 0xFF;
}

bool MPU6050::readRegs(uint8_t startReg, uint8_t *buf, uint8_t len)
{
    _wire->beginTransmission(_addr);
    _wire->write(startReg);
    if (_wire->endTransmission(false) != 0) return false;  // repeated start

    uint8_t received = _wire->requestFrom(_addr, len);
    if (received != len) return false;

    for (uint8_t i = 0; i < len; i++) {
        buf[i] = _wire->read();
    }
    return true;
}
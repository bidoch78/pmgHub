#include <pmgHubSensor.h>
#include <pmgHubUnits.h>
#include <Arduino.h>

using namespace pmgHub;

sensor::sensor(sensorId sId, String sName, String sCat, const units::unitData& sUnit, uint32_t sRate)
         : _id(sId), _name(sName), _category(sCat), _unit(sUnit), _rate(sRate) {

};

// sensor::sensorID sensor::getId() const { return _id; };
// sensor::sensorCategory sensor::getCategory() const { return _category; };
// sensor::sensorType sensor::getType() const { return _type; };
uint32_t sensor::getRate() const { return _rate; };
// String& sensor::getName() const { return _name; };

bool sensor::isVirtual() const {
    return false;
};

uint32_t sensor::getLastRead() const { return _dataLastRead; };
uint32_t sensor::getCountRead() const { return _dataCountRead; };
void sensor::resetCountRead() { _dataCountRead = 0; };
void sensor::setSampleRate(uint32_t sRate) { _srate = sRate; };
void sensor::read(uint32_t w) { _srate = _dataLastRead; _dataCountRead++; };

// void sensor::setValue(const float volt, const SensorValue& val) {

//     _dataCountRead++;
//     _readValue = val;
//     _readVoltage = volt;

// };

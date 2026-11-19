#include <pmgHubSensor.h>
#include <pmgHubUnits.h>
#include <Arduino.h>

using namespace pmgHub;

sensor::sensor(sensorId sId, String sName, String sCat, const units::unitData& sUnit, uint32_t sRate)
         : _id(sId), _name(sName), _category(sCat), _unit(sUnit), _rate(sRate) {

};

sensor::sensorId sensor::getId() const { return _id; };
// sensor::sensorCategory sensor::getCategory() const { return _category; };
// sensor::sensorType sensor::getType() const { return _type; };
uint32_t sensor::getRate() const { return _rate; };
const String& sensor::getName() const { return _name; };
const units::unitData sensor::getUnit() const { return _unit; };

bool sensor::isVirtual() const { return _unit.type == units::unitId(units::defaultUnitId::VIRTUAL); };

uint32_t sensor::getLastRead() const { return _dataLastRead; };
uint32_t sensor::getCountRead() const { return _dataCountRead; };
void sensor::resetCountRead() { _dataCountRead = 0; };
void sensor::setSampleRate(uint32_t sRate) { _srate = sRate; };
void sensor::read(uint32_t w) { _dataLastRead = w; _dataCountRead++; };

void sensor::setValue(const float volt, const units::sensorValue& val) {

    _dataCountRead++;
    _readVoltage = volt;
    _readValue = val;

};

const units::sensorValue& sensor::getValue() const { return _readValue; }

String sensor::getStringValue() {

    return std::visit([](const auto& v) -> String {
        
        using T = std::decay_t<decltype(v)>;

        if constexpr (std::is_same_v<T, std::monostate>) return "";
        else if constexpr (std::is_same_v<T, bool>) return v ? "true" : "false";
        else return String(v);

    }, _readValue);

}
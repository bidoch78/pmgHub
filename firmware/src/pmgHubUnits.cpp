#include <pmgHubUnits.h>
#include <vector>
#include <map>
#include <variant>

using namespace pmgHub;

units::units() :
    _noUnit(toUnitId(units::defaultUnitId::NO_UNIT), "", toTypeId(units::defaulUnitType::UNKNOWN), "", 0) {

    _units.emplace(toUnitId(units::defaultUnitId::UNKNOWN), 
                    unitData(toUnitId(units::defaultUnitId::UNKNOWN), "-", toTypeId(units::defaulUnitType::UNKNOWN) , "-", 0));
    _units.emplace(toUnitId(units::defaultUnitId::ON), 
                    units::unitData(toUnitId(units::defaultUnitId::ON), "SW", toTypeId(units::defaulUnitType::BOOL), "bool", 0));
    _units.emplace(toUnitId(units::defaultUnitId::BAR), 
                    units::unitData(toUnitId(units::defaultUnitId::BAR), "Bar", toTypeId(units::defaulUnitType::PRESSURE), "pressure", 2));
    _units.emplace(toUnitId(units::defaultUnitId::PSI), 
                    units::unitData(toUnitId(units::defaultUnitId::PSI), "PSI", toTypeId(units::defaulUnitType::PRESSURE), "pressure", 2));
    _units.emplace(toUnitId(units::defaultUnitId::CELSIUS), 
                    units::unitData(toUnitId(units::defaultUnitId::CELSIUS), "°C", toTypeId(units::defaulUnitType::TEMPERATURE), "temperature", 0));
    _units.emplace(toUnitId(units::defaultUnitId::FAHRENHEIT), 
                    units::unitData(toUnitId(units::defaultUnitId::FAHRENHEIT), "°F", toTypeId(units::defaulUnitType::TEMPERATURE), "temperature", 0));
    _units.emplace(toUnitId(units::defaultUnitId::PCT), 
                    units::unitData(toUnitId(units::defaultUnitId::PCT), "%", toTypeId(units::defaulUnitType::PERCENTAGE), "percentage", 0));
    _units.emplace(toUnitId(units::defaultUnitId::LAMBDA), 
                    units::unitData(toUnitId(units::defaultUnitId::LAMBDA), "λ", toTypeId(units::defaulUnitType::FUELMIXTURE), "fuelmixture", 2));
    _units.emplace(toUnitId(units::defaultUnitId::AFR), 
                    units::unitData(toUnitId(units::defaultUnitId::AFR), "AFR", toTypeId(units::defaulUnitType::FUELMIXTURE), "fuelmixture", 2));
    _units.emplace(toUnitId(units::defaultUnitId::VIRTUAL), 
                    units::unitData(toUnitId(units::defaultUnitId::VIRTUAL), "Virtual", toTypeId(units::defaulUnitType::VIRTUAL), "virtual", 0));

};
           
void units::addUnit(const units::unitData& unit) {
    _units.emplace(unit.id, unit);
};

std::vector<units::unitData> units::getUnits(units::typeId utype) const {

    std::vector<unitData> retUnit;

    for (const auto& [id, unit] : _units) {
        if (unit.type == utype) retUnit.push_back(unit);
    }

    return retUnit; 

};

std::map<units::typeId, std::vector<units::unitData>> units::units::getAllUnits() const {

    std::map<typeId, std::vector<unitData>> retUnits;

    for (const auto& [id, unit] : _units) {
        retUnits[unit.type].push_back(unit);
    }

    return retUnits;

};

const units::unitData& units::getUnit(units::unitId uid) const {

    auto it = _units.find(uid);
    if (it == _units.end()) return _noUnit;
    return it->second;

}

const units::unitData& units::getUnit(units::typeId utype, units::unitId uid) const {

    auto it = _units.find(uid);

    if (it == _units.end()) return _noUnit;
    if (it->second.type != utype) return _noUnit;

    return it->second;

};

bool units::noUnit(const units::unitData& unit) const { return unit.id == _noUnit.id; };

units::sensorValue units::convertValue(const sensorValue& value, units::unitId fromUnit, units::unitId toUnit) const {
    return transformUnit(value, fromUnit, toUnit);
};

units::sensorValue units::transformUnit(const sensorValue& value, units::unitId fromUnit, units::unitId toUnit) const {

    if (std::holds_alternative<std::monostate>(value)) return value;

    if (fromUnit == toUnit) return value;

    const unitData& fUnit = getUnit(fromUnit);
    const unitData& tUnit = getUnit(toUnit);

    if (noUnit(fUnit) || noUnit(tUnit)) return value;
    if (fUnit.type != tUnit.type) return value;

    //For all type we need a float value
    if (!std::holds_alternative<float>(value)) return value;

    float floatValue = std::get<float>(value);

    switch(fUnit.type) {

        case toTypeId(defaulUnitType::TEMPERATURE):

            if (fromUnit == toUnitId(defaultUnitId::CELSIUS) && toUnit == toUnitId(defaultUnitId::FAHRENHEIT)) {
                return (floatValue * 9.0f / 5.0f) + 32.0f;
            }
            else if (fromUnit == toUnitId(defaultUnitId::FAHRENHEIT) && toUnit == toUnitId(defaultUnitId::CELSIUS)) {
                return (floatValue - 32.0f) * 5.0f / 9.0f;
            }

            break;
        
        case toTypeId(defaulUnitType::FUELMIXTURE):

            if (fromUnit == toUnitId(defaultUnitId::LAMBDA) && toUnit == toUnitId(defaultUnitId::AFR)) {
                return floatValue * 14.7f;
            }
            else if (fromUnit == toUnitId(defaultUnitId::AFR) && toUnit == toUnitId(defaultUnitId::LAMBDA)) {
                return floatValue / 14.7f;
            }

            break;

        case toTypeId(defaulUnitType::PRESSURE):
    
            if (fromUnit == toUnitId(defaultUnitId::BAR) && toUnit == toUnitId(defaultUnitId::PSI)) {
                return floatValue * 14.5038f;
            }
            else if (fromUnit == toUnitId(defaultUnitId::PSI) && toUnit == toUnitId(defaultUnitId::BAR)) {
                return floatValue * 0.0689476f;
            }

            break;

    }

    return value;

};
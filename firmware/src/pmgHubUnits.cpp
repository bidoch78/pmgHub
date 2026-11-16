#include <pmgHubUnits.h>
#include <vector>
#include <map>
#include <variant>

using namespace pmgHub;

units::units() {

    _units.emplace(defaultUnitId::UNKNOWN, units::unitData(defaultUnitId::UNKNOWN, "-", defaulUnitType::UNKNOWN, "-", 0));
    _units.emplace(defaultUnitId::ON, units::unitData(defaultUnitId::ON, "SW", defaulUnitType::BOOL, "bool", 0));
    _units.emplace(defaultUnitId::BAR, units::unitData(defaultUnitId::BAR, "Bar", defaulUnitType::PRESSURE, "pressure", 2));
    _units.emplace(defaultUnitId::PSI, units::unitData(defaultUnitId::PSI, "PSI", defaulUnitType::PRESSURE, "pressure", 2));
    _units.emplace(defaultUnitId::CELSIUS, units::unitData(defaultUnitId::CELSIUS, "°C", defaulUnitType::TEMPERATURE, "temperature", 0));
    _units.emplace(defaultUnitId::FAHRENHEIT, units::unitData(defaultUnitId::FAHRENHEIT, "°F", defaulUnitType::TEMPERATURE, "temperature", 0));
    _units.emplace(defaultUnitId::PCT, units::unitData(defaultUnitId::PCT, "%", defaulUnitType::PERCENTAGE, "percentage", 0));
    _units.emplace(defaultUnitId::LAMBDA, units::unitData(defaultUnitId::LAMBDA, "λ", defaulUnitType::FUELMIXTURE, "fuelmixture", 2));
    _units.emplace(defaultUnitId::AFR, units::unitData(defaultUnitId::AFR, "AFR", defaulUnitType::FUELMIXTURE, "fuelmixture", 2));
    _units.emplace(defaultUnitId::VIRTUAL, units::unitData(defaultUnitId::VIRTUAL, "Virtual", defaulUnitType::VIRTUAL, "virtual", 0));

};
           
void units::addUnit(const unitData& unit) {
    _units.emplace(unit.id, unit);
};

std::vector<unitData> units::getUnits(typeId utype) const {

    std::vector<unitData> retUnit;

    for (const auto& [id, unit] : _units) {
        if (unit.type == utype) retUnit.push_back(unit);
    }

    return retUnit; 

};

std::map<typeId, std::vector<unitData>> units::getAllUnits() const {

    std::map<typeId, std::vector<unitData>> retUnits;

    for (const auto& [id, unit] : _units) {
        retUnits[unit.type].push_back(unit);
    }

    return retUnits;

};

const unitData* units::getUnit(unitId uid) const {

    auto it = _units.find(uid);
    if (it == _units.end()) return nullptr;
    return &it->second;

}

const unitData* units::getUnit(typeId utype, unitId uid) const {

    auto it = _units.find(uid);

    if (it == _units.end()) return nullptr;
    if (it->second.type != utype) return nullptr;

    return &it->second;

};

sensorValue units::convertValue(const sensorValue& value, unitId fromUnit, unitId toUnit) const {
    return transformUnit(value, fromUnit, toUnit);
};

sensorValue units::transformUnit(const sensorValue& value, unitId fromUnit, unitId toUnit) const {

    if (std::holds_alternative<std::monostate>(value)) return value;

    if (fromUnit == toUnit) return value;

    const unitData* fUnit = getUnit(fromUnit);
    const unitData* tUnit = getUnit(toUnit);

    if (fUnit == nullptr || tUnit == nullptr) return value;
    if (fUnit->type != tUnit->type) return value;

    //For all type we need a float value
    if (!std::holds_alternative<float>(value)) return value;

    float floatValue = std::get<float>(value);

    switch(fUnit->type) {

        case typeId::TEMPERATURE:

            if (fromUnit == unitId::CELSIUS && toUnit == unitId::FAHRENHEIT) {
                return (floatValue * 9.0f / 5.0f) + 32.0f;
            }
            else if (fromUnit == unitId::FAHRENHEIT && toUnit == unitId::CELSIUS) {
                return (floatValue - 32.0f) * 5.0f / 9.0f;
            }

            break;
        
        case typeId::FUELMIXTURE:

            if (fromUnit == unitId::LAMBDA && toUnit == unitId::AFR) {
                return floatValue * 14.7f;
            }
            else if (fromUnit == unitId::AFR && toUnit == unitId::LAMBDA) {
                return floatValue / 14.7f;
            }

            break;

        case typeId::PRESSURE:
    
            if (fromUnit == unitId::BAR && toUnit == unitId::PSI) {
                return floatValue * 14.5038f;
            }
            else if (fromUnit == unitId::PSI && toUnit == unitId::BAR) {
                return floatValue * 0.0689476f;
            }

            break;

    }

    return value;

}
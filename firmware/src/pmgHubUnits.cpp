#include <pmgHubUnits.h>
#include <vector>
#include <map>
#include <variant>

using namespace pmgHub;

units::units() {

    _units.emplace(static_cast<unitId>(units::defaultUnitId::UNKNOWN), 
                    unitData(static_cast<unitId>(units::defaultUnitId::UNKNOWN), "-", static_cast<typeId>(units::defaulUnitType::UNKNOWN) , "-", 0));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::ON), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::ON), "SW", static_cast<typeId>(units::defaulUnitType::BOOL), "bool", 0));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::BAR), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::BAR), "Bar", static_cast<typeId>(units::defaulUnitType::PRESSURE), "pressure", 2));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::PSI), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::PSI), "PSI", static_cast<typeId>(units::defaulUnitType::PRESSURE), "pressure", 2));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::CELSIUS), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::CELSIUS), "°C", static_cast<typeId>(units::defaulUnitType::TEMPERATURE), "temperature", 0));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::FAHRENHEIT), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::FAHRENHEIT), "°F", static_cast<typeId>(units::defaulUnitType::TEMPERATURE), "temperature", 0));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::PCT), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::PCT), "%", static_cast<typeId>(units::defaulUnitType::PERCENTAGE), "percentage", 0));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::LAMBDA), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::LAMBDA), "λ", static_cast<typeId>(units::defaulUnitType::FUELMIXTURE), "fuelmixture", 2));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::AFR), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::AFR), "AFR", static_cast<typeId>(units::defaulUnitType::FUELMIXTURE), "fuelmixture", 2));
    _units.emplace(static_cast<unitId>(units::defaultUnitId::VIRTUAL), 
                    units::unitData(static_cast<unitId>(units::defaultUnitId::VIRTUAL), "Virtual", static_cast<typeId>(units::defaulUnitType::VIRTUAL), "virtual", 0));

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

const units::unitData* units::getUnit(units::unitId uid) const {

    auto it = _units.find(uid);
    if (it == _units.end()) return nullptr;
    return &it->second;

}

const units::unitData* units::getUnit(units::typeId utype, units::unitId uid) const {

    auto it = _units.find(uid);

    if (it == _units.end()) return nullptr;
    if (it->second.type != utype) return nullptr;

    return &it->second;

};

units::sensorValue units::convertValue(const sensorValue& value, units::unitId fromUnit, units::unitId toUnit) const {
    return transformUnit(value, fromUnit, toUnit);
};

units::sensorValue units::transformUnit(const sensorValue& value, units::unitId fromUnit, units::unitId toUnit) const {

    if (std::holds_alternative<std::monostate>(value)) return value;

    if (fromUnit == toUnit) return value;

    const unitData* fUnit = getUnit(fromUnit);
    const units::unitData* tUnit = getUnit(toUnit);

    if (fUnit == nullptr || tUnit == nullptr) return value;
    if (fUnit->type != tUnit->type) return value;

    //For all type we need a float value
    if (!std::holds_alternative<float>(value)) return value;

    float floatValue = std::get<float>(value);

    switch(fUnit->type) {

        case static_cast<typeId>(defaulUnitType::TEMPERATURE):

            if (fromUnit == static_cast<unitId>(defaultUnitId::CELSIUS) && toUnit == static_cast<unitId>(defaultUnitId::FAHRENHEIT)) {
                return (floatValue * 9.0f / 5.0f) + 32.0f;
            }
            else if (fromUnit == static_cast<unitId>(defaultUnitId::FAHRENHEIT) && toUnit == static_cast<unitId>(defaultUnitId::CELSIUS)) {
                return (floatValue - 32.0f) * 5.0f / 9.0f;
            }

            break;
        
        case static_cast<typeId>(defaulUnitType::FUELMIXTURE):

            if (fromUnit == static_cast<unitId>(defaultUnitId::LAMBDA) && toUnit == static_cast<unitId>(defaultUnitId::AFR)) {
                return floatValue * 14.7f;
            }
            else if (fromUnit == static_cast<unitId>(defaultUnitId::AFR) && toUnit == static_cast<unitId>(defaultUnitId::LAMBDA)) {
                return floatValue / 14.7f;
            }

            break;

        case static_cast<typeId>(defaulUnitType::PRESSURE):
    
            if (fromUnit == static_cast<unitId>(defaultUnitId::BAR) && toUnit == static_cast<unitId>(defaultUnitId::PSI)) {
                return floatValue * 14.5038f;
            }
            else if (fromUnit == static_cast<unitId>(defaultUnitId::PSI) && toUnit == static_cast<unitId>(defaultUnitId::BAR)) {
                return floatValue * 0.0689476f;
            }

            break;

    }

    return value;

}
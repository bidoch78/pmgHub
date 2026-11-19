#include <Arduino.h>
#include <pmgHubSensors.h>
#include <pmgHubSensor.h>
#include <vector>

using namespace pmgHub;

sensors::sensors() {

    //Add default sensors

    /**** ENGINE ******/
    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_AIRPRESSURE),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_AIRPRESSURE), "Air Pressure", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::BAR)), static_cast<uint32_t>(sensor::sensorRate::HIGH_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_COOLANTTEMP),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_COOLANTTEMP), "Coolant Temperature", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::CELSIUS)), static_cast<uint32_t>(sensor::sensorRate::LOW_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_LEFT),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_LEFT), "WB Left", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::LAMBDA)), static_cast<uint32_t>(sensor::sensorRate::HIGH_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_RIGHT),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_RIGHT), "WB Left", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::LAMBDA)), static_cast<uint32_t>(sensor::sensorRate::HIGH_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_OIL_PRESSURE),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_OIL_PRESSURE), "Oil Pressure", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::BAR)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    /**** FUEL ******/
    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::FUEL_PRESSURE),
        sensor(sensor::toSensorId(sensor::defaultSensorId::FUEL_PRESSURE), "Fuel Pressure", "FUEL", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::BAR)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL),
        sensor(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL), "Fuel Level", "FUEL", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::PCT)), static_cast<uint32_t>(sensor::sensorRate::LOW_RATE)));

    /**** TRANSMISSION *****/    
    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_OIL_TEMP),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_OIL_TEMP), "T. Oil Temperature", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::CELSIUS)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_A),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_A), "T. SolA", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_B),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_B), "T. SolB", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_LC),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_LC), "T. SolLC", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_NA),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_NA), "T. Selector NA", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_1),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_1), "T. Selector 1", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_2),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_2), "T. Selector 2", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_D),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_D), "T. Selector D", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_R),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_R), "T. Selector R", "TRANSMISSION", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));
        
    /**** ENV ****/
   
    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENV_DAYNIGHT),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENV_DAYNIGHT), "Day/Night", "ENV",
        _units.getUnit(units::toUnitId(units::defaultUnitId::SWITCH)), static_cast<uint32_t>(sensor::sensorRate::LOW_RATE)));

    /**** VIRTUAL SENSORS ****/

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL_LOW),
        sensor(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL_LOW), "Fuel Low Warning", "FUEL",
        _units.getUnit(units::toUnitId(units::defaultUnitId::VIRTUAL)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));    

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL), "T. Gear", "TRANSMISSION",
        _units.getUnit(units::toUnitId(units::defaultUnitId::VIRTUAL)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));  

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SELECTOR),
        sensor(sensor::toSensorId(sensor::defaultSensorId::TRANS_SELECTOR), "T. Selector", "TRANSMISSION",
        _units.getUnit(units::toUnitId(units::defaultUnitId::VIRTUAL)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));  

};

sensor* sensors::find(sensor::sensorId sid) {
    auto it = _sensors.find(sid);
    if (it == _sensors.end()) return nullptr;
    return &it->second;
}

const sensor* sensors::find(sensor::sensorId sid) const {
    auto it = _sensors.find(sid);
    if (it == _sensors.end()) return nullptr;
    return &it->second;
}

void sensors::update() {

    const uint32_t now = millis();

    if (!_lastUpdate) _lastUpdate = now;

    const uint32_t elapsed = now - _lastUpdate;
    const uint32_t updateSrate = elapsed >= 1000;    

    std::vector<sensor*> virtuals;
    std::vector<sensor*> updateSensors;
    
    for (auto& [id, sensor] : _sensors) {
        
        if (updateSrate) {
            sensor.setSampleRate(sensor.getCountRead() * 1000 / elapsed);
            sensor.resetCountRead();
        }

        const uint32_t lRead = sensor.getLastRead();
        if (lRead && (now - lRead) < sensor.getRate()) continue;

        sensor.read(now);
    
        if (sensor.isVirtual()) {
            virtuals.push_back(&sensor);
            continue;
        }

        /// Need to read sensor
        updateSensors.push_back(&sensor);

    }

    if (!updateSensors.empty()) retrieveSensors(updateSensors);

    // Virtual sensors
    for (sensor* const s : virtuals) {
        
        switch(s->getId()) {
            case sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL):
                generateTransGearSel(s);
                break;
            case sensor::toSensorId(sensor::defaultSensorId::TRANS_SELECTOR):
                generateTransSelector(s);
                break;
            case sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL_LOW):
                generateFuelLowLevel(s);
                break;
        }

    }

    if (updateSrate) _lastUpdate = now;

};

void sensors::generateTransGearSel(sensor* const s) {

    int32_t gear = -1;

    const bool na = getSensorValue<bool>(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_NA), false);
    const bool rv = getSensorValue<bool>(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_R), false);

    if (na) {
        gear = 0;
    }
    else if (rv) {
        gear = 1;
    }
    else {

        const bool solA = getSensorValue<bool>(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_A), false);
        const bool solB = getSensorValue<bool>(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_B), false);

        if (solA && solB) {
            gear = 1;
        }
        else if (!solA && solB) {
            gear = 2;
        }
        else if (!solA && !solB) {
            gear = 3;
        }
        else if (solA && !solB) {
            
            const bool solLC = getSensorValue<bool>(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_LC), false);
            gear = solLC ? 5 : 4;
        
        }

    }

    s->setValue(0, gear);

};

void sensors::generateTransSelector(sensor* const s) {

    String selectorPos = "-";

    static constexpr sensor::defaultSensorId sensorsToRead[] = {
        sensor::defaultSensorId::TRANS_GEARSEL_NA,
        sensor::defaultSensorId::TRANS_GEARSEL_D,
        sensor::defaultSensorId::TRANS_GEARSEL_R,
        sensor::defaultSensorId::TRANS_GEARSEL_1,
        sensor::defaultSensorId::TRANS_GEARSEL_2
    };
        
    for (const auto& sensorName : sensorsToRead) {

        const sensor* gearSensor = find(sensor::toSensorId(sensorName));
        if (gearSensor == nullptr) continue;

        const units::sensorValue& sValue = gearSensor->getValue();
        if (!units::hasValue(sValue)) continue;

        if (units::getValue<bool>(sValue, false) == true) {
            switch(sensorName) {
                case sensor::defaultSensorId::TRANS_GEARSEL_NA: selectorPos = "NA"; break;
                case sensor::defaultSensorId::TRANS_GEARSEL_D: selectorPos = "D"; break;
                case sensor::defaultSensorId::TRANS_GEARSEL_R: selectorPos = "R"; break;
                case sensor::defaultSensorId::TRANS_GEARSEL_1: selectorPos = "1"; break;
                case sensor::defaultSensorId::TRANS_GEARSEL_2: selectorPos = "2"; break;
            }
            break;
        }

    }

    s->setValue(0, selectorPos);

};

void sensors::generateFuelLowLevel(sensor* const s) {

    const sensor* fuelLevel = find(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL));

    if (fuelLevel != nullptr) {

        const units::sensorValue& fuelLevelValue = fuelLevel->getValue();
        if (units::hasValue(fuelLevelValue)) {
            s->setValue(0, units::getValue<int32_t>(fuelLevelValue, 100) <= 10);
            return;
        }

    }

    s->setValue(0, std::monostate()); 

};

float sensors::roundValue(float value, uint32_t decimals) {
    float factor = std::pow(10.0f, decimals);
    return std::round(value * factor) / factor;
};

units::sensorValue sensors::convertFloatToSensorValue(float value, const units::unitData& unit) {

    if (isnan(value)) return std::monostate{};

    if (unit.type == units::toTypeId(units::defaulUnitType::BOOL)) return value ? true : false;
    if (unit.decimals == 0) return static_cast<int32_t>(std::round(value));

    return roundValue(value, unit.decimals);

};

String sensorValueToString(const units::sensorValue& value) {

    return std::visit([](const auto& v) -> String {
        
        using T = std::decay_t<decltype(v)>;

        if constexpr (std::is_same_v<T, std::monostate>)
            return "";

        else if constexpr (std::is_same_v<T, bool>)
            return v ? "true" : "false";

        else
            return String(v);

    }, value);

};
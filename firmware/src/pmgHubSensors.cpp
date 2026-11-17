#include <pmgHubSensors.h>
#include <pmgHubSensor.h>

using namespace pmgHub;

sensors::sensors() {

    //Add default sensors
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

    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_RIGHT),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_RIGHT), "Oil Pressure", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::BAR)), static_cast<uint32_t>(sensor::sensorRate::MEDIUM_RATE)));

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

void sensors::update(std::map<sensor::sensorId, sensor>& sensors) {

    

};
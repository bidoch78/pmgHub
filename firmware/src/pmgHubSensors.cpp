#include <Arduino.h>
#include <pmgHubSensors.h>
#include <pmgHubSensor.h>
#include <vector.h>

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

void sensors::update() {

    const uint32_t now = millis();

    if (!this._lastUpdate) this._lastUpdate = now;

    const uint32_t elapsed = now - this._lastUpdate;
    const uint32_t updateSrate = elapsed >= 1000;    

    std::vector<sensor*> virtuals;
    std::vector<sensor*> updateSensors;
    
    for (auto& [id, sensor] : _sensors) {
        
        if (updateSrate) {
            sensor.setSampleRate(item.getCountRead() * 1000 / elapsed);
            sensor.resetCountRead();
        }

        const lRead = sensor.getLastRead();
        if (lRead && (now - lRead) < sensor.getRate()) continue;

        sensor.read(now);
    
        if (sensor.isVirtual()) {
            virtuals.push_back(&sensor);
            continue;
        }

        ///////
        updateSensors.push_back(&sensor);

    }

    if (!updateSensors.empty()) retrieveSensors(&updateSensors);

    // Virtual sensors
    for (sensor* const sensor : virtuals) {
        //sensor->read(now);
    }

    if (updateSrate) this._lastUpdate = now;

};
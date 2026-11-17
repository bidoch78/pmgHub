#include <pmgHubServices.h>
#include <pmgHubSensors.h>
#include <pmgHubSensor.h>

using namespace pmgHub;

sensors::sensors(services& srv) : _services(srv) {

    //Add default sensors
    _sensors.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_AIRPRESSURE),
        sensor(sensor::toSensorId(sensor::defaultSensorId::ENGINE_AIRPRESSURE), "Air Pressure", "ENGINE", 
        _units.getUnit(units::toUnitId(units::defaultUnitId::BAR)), static_cast<uint32_t>(sensor::sensorRate::HIGH_RATE)));

};

// sensor sensors::find(sensor::sensorID) const {


// };

// void sensors::update(std::map<sensor::sensorID, sensor> sensors) {


// };
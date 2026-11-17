#include <pmgHubServices.h>
#include <pmgHubSensors.h>
#include <pmgHubSensor.h>

using namespace pmgHub;

sensors::sensors(services& svc) : _services(srv) {

    //Add default sensors
    _sensors.emplace(toSensorId(sensor::defaultSensorID::ENGINE_AIRPRESSURE),
                        new sensor(toSensorId(sensor::defaultSensorID::ENGINE_AIRPRESSURE), "Air Pressure", "ENGINE", _unit.getUnit(units::toUnitId(units::defaultUnitId::BAR)), static_cast<uint32_t>(sensor::sensorRate::HIGH));

};

// sensor sensors::find(sensor::sensorID) const {


// };

// void sensors::update(std::map<sensor::sensorID, sensor> sensors) {


// };
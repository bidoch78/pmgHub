#include <pmgHubSensorsSimulator.h>
#include <pmgHubSensors.h>
#include <esp_random.h>

using namespace pmgHub;

/*
float randomFloat(float min, float max) {
    return min + (esp_random() / (float)UINT32_MAX) * (max - min);
}

bool randomBool() {
    return esp_random() & 1;
}
*/

sensorsSimulator::sensorsSimulator() {

    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_AIRPRESSURE), sensorSimData(simDataType::SIM_RANGE, {0.0f, 5.0f}, { -0.5f, 2.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_COOLANTTEMP), sensorSimData(simDataType::SIM_RANGE, {0.0f, 5.0f}, { 0.0f, 100.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_LEFT), sensorSimData(simDataType::SIM_RANGE, {0.0f, 5.0f}, { 0.68f, 1.36f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_WB_RIGHT), sensorSimData(simDataType::SIM_RANGE, {0.0f, 5.0f}, { 0.68f, 1.36f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_OIL_PRESSURE), sensorSimData(simDataType::SIM_RANGE, {0.0f, 5.0f}, { 0.0f, 7.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::FUEL_PRESSURE), sensorSimData(simDataType::SIM_RANGE, {0.0f, 5.0f}, { 0.0f, 5.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL), sensorSimData(simDataType::SIM_RANGE, {0.0f, 12.0f}, { 0.0f, 100.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_OIL_TEMP), sensorSimData(simDataType::SIM_RANGE, {0.0f, 12.0f}, { 0.0f, 120.0f }));

    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_A), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_B), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SOL_LC), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_NA), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_1), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_2), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_D), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL_R), sensorSimData(simDataType::SIM_PULL, {0.0f, 12.0f}, { 0.0f, 1.0f }));

    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENV_DAYNIGHT), sensorSimData(simDataType::SIM_PULL, {0.0f, 5.0f}, { 0.0f, 1.0f }));

    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::FUEL_LEVEL_LOW), sensorSimData(simDataType::SIM_VIRTUAL, {}, {}));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_GEARSEL), sensorSimData(simDataType::SIM_VIRTUAL, {}, {}));
    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::TRANS_SELECTOR), sensorSimData(simDataType::SIM_VIRTUAL, {}, {}));

};

void sensorsSimulator::retrieveSensors(const std::vector<sensor*>& sensors) {

    Serial.printf("Read ");
    for (sensor* sensor : sensors) {
        Serial.printf(" %s", sensor->getName().c_str());
    }
    Serial.printf("\n");
};
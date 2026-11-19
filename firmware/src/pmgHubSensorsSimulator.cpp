#include <pmgHubSensorsSimulator.h>
#include <pmgHubSensors.h>
#include <esp_random.h>
#include <algorithm>

using namespace pmgHub;

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

const sensorsSimulator::sensorSimData* sensorsSimulator::getSimData(sensor::sensorId id) const {
    
    auto it = _simData.find(id);
    if (it == _simData.end()) return nullptr;
    return &it->second;

};

void sensorsSimulator::retrieveSensors(const std::vector<sensor*>& sensors) {

    Serial.printf("Read\n");
    for (sensor* sensor : sensors) {

        Serial.printf(" %s", sensor->getName().c_str());

        const sensorSimData* data = getSimData(sensor->getId());
        if (data == nullptr) continue;

        float voltage = 0;

        switch(data->type) {

            case simDataType::SIM_RANGE:
                if (data->in.size() > 1) voltage = randomFloat(data->in[0], data->in[1]);
                break;

            case simDataType::SIM_PULL:
                if (data->in.size() > 1) voltage = randomBool(data->in[0], data->in[1]);
                break;

        }

        float value = (data->in.size() > 1 && data->out.size() > 1) ? convertLinar(voltage, data->in[0], data->in[1], data->out[0], data->out[1]) : NAN;

        //Update sensor values
        if (isnan(value)) {
            //reading error
            sensor.setValue(voltage, std::monostate{}):
        }
        else {
            //Rounding (check format)
            value = sensors::roundValue(value, )
        }

        Serial.printf(" - voltage: %f, value: %f", voltage, value);
    
    }
    Serial.printf("\n");
};

float sensorsSimulator::randomFloat(float min, float max) {
    return min + (esp_random() / (float)UINT32_MAX) * (max - min);
};

float sensorsSimulator::randomBool(float min, float max) {
    return (esp_random() & 1) ? max: min;
};

float sensorsSimulator::convertLinar(float value, float inMin, float inMax, float outMin, float outMax) {
      
    if ((inMax - inMin) == 0) return NAN;

    const float ratio = (value - inMin) / (inMax - inMin);
    const float result = outMin + ratio * (outMax - outMin);
    
    //never before min and after max
    return std::min(std::max(result, std::min(outMin, outMax)), std::max(outMin, outMax));

};
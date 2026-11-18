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

    _simData.emplace(sensor::toSensorId(sensor::defaultSensorId::ENGINE_AIRPRESSURE), 
                        simDataType(simDataType::SIM_RANGE, {0.0f, 5.0f}, { -0.5f, 2 }));

};

void sensorsSimulator::retrieveSensors(const std::vector<sensor*>& sensors) {

    Serial.printf("Read ");
    for (sensor* sensor : sensors) {
        Serial.printf(" %s", sensor->getName().c_str());
    }
    Serial.printf("\n");
};
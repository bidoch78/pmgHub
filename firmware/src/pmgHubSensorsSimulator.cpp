#include <pmgHubSensorsSimulator.h>
#include <pmgHubSensors.h>

using namespace pmgHub;

sensorsSimulator::sensorsSimulator() {



};

void sensorsSimulator::retrieveSensors(const std::vector<sensor*>& sensors) {

    Serial.printf("Read ");
    for (sensor* sensor : sensors) {
        Serial.printf(" %s", sensor->getName().c_str());
    }
    Serial.printf("\n");
};
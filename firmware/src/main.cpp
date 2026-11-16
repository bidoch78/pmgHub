#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubServices.h>
#include <pmgHubWebServer.h>
#include <pmgHubUnits.h>

pmgHub::services services;
pmgHub::webServer webServer(services);
pmgHub::units units;

void setup()
{

    Serial.begin(115200);
    webServer.initialize();

    pmgHub::units::sensorValue val = 1.2f;

    pmgHub::units::sensorValue conv = units.transformUnit(val, static_cast<pmgHub::units::unitId>(pmgHub::units::defaultUnitId::BAR), 
                                                                    static_cast<pmgHub::units::unitId>(pmgHub::units::defaultUnitId::PSI));

    Serial.printf("Convert value: %f\n", std::get<float>(conv));

    // Serial.println("pmgHub started");
    // Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    // Serial.printf("PSRAM free: %u", ESP.getFreePsram());
    
}

void loop()
{
    webServer.process();
}

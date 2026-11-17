#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubServices.h>
#include <pmgHubWebServer.h>
#include <pmgHubSensors.h>
#include <pmgHubSessionManager.h>

pmgHub::sessionManager sessions(pmgHub::config::sessionTimeoutMs); 
pmgHub::storage storage;
pmgHub::sensors sensors;
pmgHub::services services(sessions, storage, sensors);
pmgHub::webServer webServer(services);

void setup()
{

    Serial.begin(115200);
    webServer.initialize();

    // Serial.println("pmgHub started");
    // Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    // Serial.printf("PSRAM free: %u", ESP.getFreePsram());
    
}

void loop()
{
    webServer.process();
}

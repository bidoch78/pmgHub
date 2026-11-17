#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubServices.h>
#include <pmgHubWebServer.h>
#include <pmgHubUnits.h>
#include <pmgHubSensors.h>
#include <pmgHubSessions.h>

pmgHub::sessions sessions; 
pmhHub::storage storage;
pmhHub::sensors sensors;

pmgHub::services services(sessions, storage, sensors);
pmgHub::webServer webServer(services);

//services(sessionManager& ssessions, storage& sstorage, sensors& ssensor) : _sessions(*this, pmgHub::config::sessionTimeoutMs), _storage() {}

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

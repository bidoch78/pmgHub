#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubServices.h>
#include <pmgHubWebServer.h>
#include <pmgHubSensorsSimulator.h>
#include <pmgHubSessionManager.h>
#include <pmgHubClientSessionManager.h>

pmgHub::sessionManager sessions(pmgHub::config::sessionTimeoutMs); 
pmgHub::storage storage;
pmgHub::sensorsSimulator sensors;
pmgHub::wsClientSessionManager csManager(pmgHub::config::csManager_pingInterval, pmgHub::config::csManager_pongTimeout, 
                                            pmgHub::config::csManager_checkInterval, pmgHub::config::csManager_authenticationTimeout);
pmgHub::services services(sessions, storage, sensors, csManager);
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

    //server routines
    webServer.process();

    //read sensors
    sensors.update();

}

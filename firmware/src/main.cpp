#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubServices.h>
#include <pmgHubWebServer.h>
#include <pmgHubSensorsSimulator.h>
#include <pmgHubSessionManager.h>
#include <pmgHubClientSessionManager.h>
#include <pmgHubDevices.h>

pmgHub::devices myDevices;
pmgHub::sessionManager mySessions(pmgHub::config::sessionTimeoutMs); 
pmgHub::storage myStorage;
pmgHub::sensorsSimulator mySensors;
pmgHub::wsClientSessionManager myCSManager(pmgHub::config::csManager_pingInterval, pmgHub::config::csManager_pongTimeout, 
                                            pmgHub::config::csManager_checkInterval, pmgHub::config::csManager_authenticationTimeout);
pmgHub::services myServices(mySessions, myStorage, mySensors, myCSManager, myDevices);
pmgHub::webServer myWebServer(myServices);

void setup()
{

    Serial.begin(115200);

    myWebServer.initialize();

    // Serial.println("pmgHub started");
    // Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    // Serial.printf("PSRAM free: %u", ESP.getFreePsram());
    
}

void loop()
{

    //server routines
    myWebServer.process();

    //read sensors
    mySensors.update();

}

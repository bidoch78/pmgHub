#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubServices.h>
//#include <pmgHubWebServer.h>

pmgHub::services services;
//pmgHub::webServer webServer(services);

void setup()
{

    Serial.begin(115200);
   // webServer.initialize();

    // Serial.println("pmgHub started");
    // Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    // Serial.printf("PSRAM free: %u", ESP.getFreePsram());
    
}

void loop()
{
   // webServer.process();
}

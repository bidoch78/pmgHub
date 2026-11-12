#include <Arduino.h>
#include <pmgHubConfig.h>
#include <pmgHubWebServer.h>
#include <pmgServices.h>

pmgHub::webServer webServer;
pmgHub::Services services;

void setup()
{

    Serial.begin(115200);
    webServer.initialize();

    // Serial.println("pmgHub started");
    // Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    // Serial.printf("PSRAM free: %u", ESP.getFreePsram());

    // startWebServer();
    
}

void loop()
{
    webServer.process();
}

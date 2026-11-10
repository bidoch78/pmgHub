#include <Arduino.h>

void setup()
{
    Serial.begin(115200);

    delay(1000);

    Serial.println("pmgHub started");
    Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    Serial.printf("PSRAM free: %u", ESP.getFreePsram());
    
}

void loop()
{
    delay(1000);
    Serial.println("pmgHub running");
}

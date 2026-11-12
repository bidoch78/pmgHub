#pragma once

#include <WiFi.h>

namespace pmgHub::config {
    
    constexpr char WIFI_STA_SSID[] = "ilnyenapas";
    constexpr char WIFI_STA_PASSWORD[] = "bienvenueChezLesBidolis";

    constexpr char WIFI_AP_SSID[] = "pmghub";
    constexpr char WIFI_AP_PASSWORD[] = "pmg1234hub";

    constexpr wifi_mode_t WIFI_MODE = WIFI_STA;

    constexpr uint32_t sessionTimeoutMs = 60 * 60 * 1000; // web interface timeout
    constexpr uint32_t maxSessions = 10; // web interface + devices

}
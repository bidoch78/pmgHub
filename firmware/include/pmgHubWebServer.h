#pragma once

#include <pmgHubConfig.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <WebServer.h>

namespace pmgHub {

    class webServer {

        private:

            static constexpr uint32_t CHECK_WIFI_EVERY = 500;

            uint32_t _lastWifiCheckStatus = 0;
            bool _firstConnection = true;

            void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info)
            {
                switch (event)
                {
                    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
                        _firstConnection = false;
                        Serial.println("[WiFi] Connected");
                        break;

                    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
                        Serial.print("[WiFi] IP: ");
                        Serial.println(WiFi.localIP());
                        Serial.println(WiFi.macAddress());
                        break;

                    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
                        Serial.println("[WiFi] Disconnected");
                        break;

                    default:
                        break;
                }
            }


        public:

            void initialize() {

                WiFi.onEvent([this](WiFiEvent_t event, WiFiEventInfo_t info) { this->onWiFiEvent(event, info); });
                WiFi.mode(pmgHub::config::WIFI_MODE);

                if (pmgHub::config::WIFI_MODE == WIFI_STA) {
                    WiFi.begin(pmgHub::config::WIFI_STA_SSID, pmgHub::config::WIFI_STA_PASSWORD);
                }
                else {
                    WiFi.softAP(pmgHub::config::WIFI_AP_SSID, pmgHub::config::WIFI_AP_PASSWORD);
                }
            
            }

            void process() {

                uint32_t now = millis();
                
                //Check wifi connection
                if (now - _lastWifiCheckStatus >= CHECK_WIFI_EVERY) {

                    _lastWifiCheckStatus = millis();
                    if (!_firstConnection) {

                        if (WiFi.status() != WL_CONNECTED) {
                            WiFi.disconnect();
                            WiFi.reconnect();
                        }

                    }

                }

            }

    };

};
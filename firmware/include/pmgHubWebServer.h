#pragma once

#include <pmgHubConfig.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <WebServer.h>

namespace pmgHub {

    class webServer {

        private:

            static constexpr uint32_t CHECK_WIFI_EVERY = 5000;

            uint32_t _lastWifiCheckStatus = 0;
            bool _firstConnection = true;
            WebServer _server;

            void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info)
            {
                switch (event)
                {
                    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
                        Serial.println("[WiFi] Connected");
                        break;

                    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
                        _firstConnection = false;
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

            void handleHTTPRequest() {

                String path = _server.uri();

                // -------------------------------
                // ---- WEB
                // ----

                // ---------- STATIC ASSETS ----------

                Serial.println(path);
                _server.send(404, "text/plain", String("Not found: ") + path);

            }

        public:

            webServer() : _server(80) {

            }

            void initialize() {

                //WIFI
                WiFi.onEvent([this](WiFiEvent_t event, WiFiEventInfo_t info) { this->onWiFiEvent(event, info); });
                WiFi.mode(pmgHub::config::WIFI_MODE);

                if (pmgHub::config::WIFI_MODE == WIFI_STA) {
                    WiFi.begin(pmgHub::config::WIFI_STA_SSID, pmgHub::config::WIFI_STA_PASSWORD);
                }
                else {
                    WiFi.softAP(pmgHub::config::WIFI_AP_SSID, pmgHub::config::WIFI_AP_PASSWORD);
                }

                // Start the server only after the WiFi stack has initialized lwIP.
                _server.onNotFound([this]() { this->handleHTTPRequest(); });
                _server.begin();

            }

            void process() {

                uint32_t now = millis();
                
                //Check wifi connection
                if (now - _lastWifiCheckStatus >= CHECK_WIFI_EVERY) {

                    _lastWifiCheckStatus = millis();
                    if (!_firstConnection) {

                        if (WiFi.status() != WL_CONNECTED) {
                            WiFi.reconnect();
                        }

                    }

                }

                //ServerWeb
                _server.handleClient();

            }

    };

};
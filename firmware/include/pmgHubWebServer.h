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
            fs::LittleFSFS _webFS;

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

            const char *getContentType(const String& path)
            {
                const int extensionStart = path.lastIndexOf('.') + 1;
                String extension = path.substring(extensionStart);
                extension.toLowerCase();

                if (extension == "html") return "text/html";
                if (extension == "css") return "text/css";
                if (extension == "js") return "application/javascript";
                if (extension == "json") return "application/json";
                if (extension == "svg") return "image/svg+xml";
                if (extension == "png") return "image/png";
                if (extension == "jpg" || extension == "jpeg") return "image/jpeg";
                if (extension == "ico") return "image/x-icon";
                return "application/octet-stream";
            }            

            bool isWebFile(const String& uri) {

                bool isFile = false;

                if (_webFS.exists(uri)) {
                    File file = _webFS.open(uri, "r");
                    isFile = file && !file.isDirectory();
                    file.close();
                }
                return isFile;

            }

            bool returnFile(const String& uri) {

                if (_webFS.exists(uri)) {;
                    File file = _webFS.open(uri, "r");
                    _server.streamFile(file, getContentType(uri));
                    file.close();
                    return true;
                }
                
                return false;

            }

            void handleHTTPRequest() {

                String path = _server.uri();
                
                // -------------------------------
                // ---- WEB
                // ----

                // ---------- STATIC ASSETS ----------

                Serial.println(path);

                const String& webFile = path;

                if (isWebFile(webFile)) {
                    if (returnFile(webFile)) return;
                }


                // ---------- DEFAULT PAGE ----------
                if (path == "/" && _server.method() == HTTP_GET) {
                    returnFile("/index.html");
                    return;
                }

                _server.send(404, "text/plain", String("Not found: ") + path);

            }

        public:

            webServer() : _server(80) {

            }

            void initialize() {

                if (!_webFS.begin(false, "/web", 10, "web")) {
                    Serial.println("Failed to mount web filesystem");
                }

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

                    _lastWifiCheckStatus = now;
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
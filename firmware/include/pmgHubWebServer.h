#pragma once

#include <pmgHubConfig.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <pmgHubServices.h>
#include <pmgHubSessionManager.h>
//#include <ArduinoJson.h>

namespace pmgHub {

    class webServer {

        private:

            static constexpr uint32_t CHECK_WIFI_EVERY = 5000;

            uint32_t _lastWifiCheckStatus = 0;
            bool _firstConnection = true;
            WebServer _server;
            fs::LittleFSFS _webFS;
            services& _services;

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
            
            void setSessionCookie(String& token, uint32_t maxAgeMs = pmgHub::config::sessionTimeoutMs) {
                String cookie = "session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + String(maxAgeMs/1000);
                _server.sendHeader("Set-Cookie", cookie);
            }

            void clearSessionCookie() {
                _server.sendHeader("Set-Cookie", "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
            }

            String getCookieData(const String& cookieHeader, const String& cookieName) {

                int32_t start = 0;

                while (start < cookieHeader.length()) {
                    
                    int32_t end = cookieHeader.indexOf(';', start);

                    if (end < 0) end = cookieHeader.length();

                    String part = cookieHeader.substring(start, end);
                    part.trim();

                    int32_t separator = part.indexOf('=');

                    if (separator >= 0) {

                        String name = part.substring(0, separator);
                        name.trim();

                        if (name == cookieName) {
                            String value = part.substring(separator + 1);
                            value.trim();
                            return value;
                        }
                    }

                    start = end + 1;

                }

                return "";


            }

            bool hasCredentials() {
                return false;
                //return readCredentials() !== null; 
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

                const bool isAuth = isAuthenticated(_services.getSessions());

                // ----------  API PUBLIC ROUTES ----------

                if (path.startsWith("/api/")) {

                    // ---------- API CREDENTIALS IS CREATED ?----------
                    if (path == "/api/auth/status" && _server.method() == HTTP_GET) {

                        String credentialsStatus = hasCredentials() ? "true" : "false";
                        String json = "{\"initialized\":" + credentialsStatus + "}";
                        _server.send(200, "application/json", json);
                        return;

                    }

                    // ---------- API LOGOUT  ----------
                    if (path == "/api/logout" && _server.method() == HTTP_GET) {
                        
                        const String token = getSessionToken();

                        if (token.isEmpty()) _services.getSessions().remove(token);

                        clearSessionCookie();
                        _server.send(200, "application/json", "{\"ok\":true}");
                        return;

                    }                    

                }

                // ----------  LOGIN REDIRECTION ----------                
                if (!isAuth) {

                    if (path.startsWith("/api/")) {

                        if (path == "/api/auth/initialize" && _server.method() == HTTP_POST) {

                            

                        }

                    }
                    else {
                        
                        if (path != "/login") {
                            _server.sendHeader("Location", "/login");
                            _server.send(302);
                            return;
                        }

                    }

                }

                // ---------- DEFAULT PAGE ----------
                if (path == "/" && _server.method() == HTTP_GET) {
                    returnFile("/index.html");
                    return;
                }

                // ---------- LOGIN PAGE ----------
                if (path == "/login" && _server.method() == HTTP_GET) {
                    if (isAuth) {
                        // redirect to /
                        _server.sendHeader("Location", "/");
                        _server.send(302);
                        return;
                    }
                    returnFile("/login.html");
                    return;
                }
           
                _server.send(404, "text/plain", String("Not found: ") + path);

            }

        public:

            webServer(services& services) : _server(80), _services(services) {

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

                // Need to read Cookie header
                const char* headerKeys[] = { "Cookie" };
                _server.collectHeaders(headerKeys, 1);

                // Start the http server
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

            /////////////////////////

            String getSessionToken() { return getCookieData(_server.header("Cookie"), "session"); }

            bool isAuthenticated(sessionManager& sessions) {
                String token = getSessionToken();
                return sessions.validate(token);
            }

// function getSessionTypeAuthenticated(req, sessions) { 
//     const token = getSessionToken(req);
//     if (!sessions.validate(token)) return null;
//     return sessions.getType(token);
// }

    };

};
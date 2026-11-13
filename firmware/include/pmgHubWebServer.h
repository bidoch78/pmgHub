#pragma once

#include <pmgHubConfig.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <pmgHubServices.h>
#include <pmgHubSessionManager.h>
#include <ArduinoJson.h>
#include <pmgHubCryptoManager.h>

namespace pmgHub {

    class webServer {

        private:

            static constexpr uint32_t CHECK_WIFI_EVERY = 5000;

            uint32_t _lastWifiCheckStatus = 0;
            bool _firstConnection = true;
            WebServer _server;
            fs::LittleFSFS _webFS;
            fs::LittleFSFS _storageFS;
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

                //Little tweak
                // API is not a file, so we don't want to serve it as a static file
                if (uri.startsWith("/api/")) return false;
                if (uri == "/login") return false;

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

            JsonDocument readCredentials() {

                File file = _storageFS.open("/credentials.json", "r");
                if (!file) {
                    Serial.println("Failed to open credentials file for reading.");
                    return JsonDocument();
                }

                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, file);
                file.close();

                if (error) {
                    Serial.println("Failed to parse credentials JSON.");
                    doc.clear();
                }

                return doc;

            }

            bool hasCredentials() {
                JsonDocument doc = readCredentials();
                return (doc.is<JsonObject>() && doc.size() > 0);
            }

            bool isValidPassword(const String& password) {

                if (password.isEmpty()) return false;

                // if (password == emergencyPasswordAdmin) {
                //     resetCredentials();
                //     return true;
                // }

                const JsonDocument credentials = readCredentials();

                if (!credentials.is<JsonObject>() && credentials.size() == 0) return false;

                const String algorithm = credentials["algorithm"].as<String>();

                if (algorithm == "pbkdf2-sha256") {
                    
                    const String salt = credentials["salt"].as<String>();
                    const String expectedHash = credentials["hash"].as<String>();
                    const uint32_t iterations = credentials["iterations"].as<uint32_t>();

                    String computedHash;

                    bool success = pmgHub::CryptoManager::hashPassword(password, salt, computedHash, iterations);

                    if (success) return (computedHash == expectedHash);

                }

                return false;

            }

            bool initializeCredentials(const String& password) {
                
                if (hasCredentials()) return false;

                // Save credentials
                String salt = pmgHub::CryptoManager::generateSalt();
                String hash;

                bool success = pmgHub::CryptoManager::hashPassword(password, salt, hash, pmgHub::config::PBKDF2_HMAC_SHA256_iterations);
                if (success) {
                    
                    JsonDocument doc;

                    doc["algorithm"] = "pbkdf2-sha256";
                    doc["iterations"] = pmgHub::config::PBKDF2_HMAC_SHA256_iterations;
                    doc["salt"] = salt;
                    doc["hash"] = hash;

                    Serial.println("Credentials initialized successfully.");

                    File file = _storageFS.open("/credentials.json", "w");
                    if (!file) {
                        Serial.println("Failed to open credentials file for writing.");
                        return false;
                    }

                    size_t bytesWritten = serializeJson(doc, file);
                    file.close();

                    if (bytesWritten == 0) {
                        Serial.println("Error during JSON writing");
                        return false;
                    }

                } else {
                    Serial.println("Failed to hash password.");
                    return false;
                }

                return true;
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
                Serial.printf("Is Authenticated: %u", isAuth);

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

                            String body = _server.arg("plain");
                            JsonDocument doc;
                            DeserializationError error = deserializeJson(doc, body);
                            if (error) {
                                _server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                                return;
                            }  

                            JsonVariantConst password = doc["password"];
                            if (!password.is<const char*>() || password.as<const char*>()[0] == '\0') {
                                _server.send(400, "application/json", "{\"error\":\"INVALID_CREDENTIALS\"}");
                                return;
                            }

                            String passwordString = password.as<String>();

                            // Save credentials
                            if (!initializeCredentials(passwordString)) {
                                _server.send(409, "application/json", "{\"error\":\"FAILED_TO_SAVE_CREDENTIALS\"}");
                                return;
                            }

                            _server.send(200, "application/json", "{\"ok\":true}");
                            return;

                        }

                        // ---------- API AUTHENTICATION - LOGIN  ----------
                        if (path == "/api/login" && _server.method() == HTTP_POST) {

                            String body = _server.arg("plain");
                            JsonDocument doc;
                            DeserializationError error = deserializeJson(doc, body);
                            if (error) {
                                _server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                                return;
                            }  

                            JsonVariantConst password = doc["password"];
                            if (!password.is<const char*>() || password.as<const char*>()[0] == '\0') {
                                _server.send(400, "application/json", "{\"error\":\"INVALID_CREDENTIALS\"}");
                                return;
                            
                            }

                            if (!isValidPassword(password.as<String>())) {
                                _server.send(401, "application/json", "{\"error\":\"INVALID_CREDENTIALS\"}");
                                return;
                            }   

                            String token =  _services.getSessions().create(sessionManager::sessionType::webAdmin);
                            setSessionCookie(token, pmgHub::config::sessionTimeoutMs);

                            _server.send(200, "application/json", "{\"ok\":true}");

                            return;

                        }

                        // ---------- ERROR ----------
                        _server.send(500, "text/plain", "Internal server error (2)");
                        return;                        

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

                if (!_storageFS.begin(true, "/storage", 10, "storage")) {
                    Serial.println("Failed to mount storage filesystem");
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
                Serial.printf("Session Token: %s", token.c_str());
                Serial.printf("Cookie Header: %s", _server.header("Cookie").c_str());
                return sessions.validate(token);
            }

            sessionManager::sessionType getSessionTypeAuthenticated(sessionManager& sessions) { 
                String token = getSessionToken();
                if (!sessions.validate(token)) return sessionManager::sessionType::unknown;
                return sessions.getType(token);
            }

    };

};
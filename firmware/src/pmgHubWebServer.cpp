#include <pmgHubWebServer.h>
#include <pmgHubServices.h>

#include <esp_http_server.h>
#include <LittleFS.h>

using namespace pmgHub;

void webServer::onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {

    switch (event) {
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

};

bool webServer::returnFile(const String& uri) {

    if (_webFS.exists(uri)) {;
        File file = _webFS.open(uri, "r");
        //_server.streamFile(file, getContentType(uri));
        file.close();
        return true;
    }
    
    return false;

};

const char* webServer::getContentType(const String& path) {

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

bool webServer::isWebFile(const String& uri) {

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

};

void webServer::initialize() {

    if (!_webFS.begin(false, "/web", 10, "web")) {
        Serial.println("Failed to mount web filesystem");
    }

//                 if (!_storageFS.begin(true, "/storage", 10, "storage")) {
//                     Serial.println("Failed to mount storage filesystem");
//                 }

//                 //WIFI
//                 WiFi.onEvent([this](WiFiEvent_t event, WiFiEventInfo_t info) { this->onWiFiEvent(event, info); });
//                 WiFi.mode(pmgHub::config::WIFI_MODE);

//                 if (pmgHub::config::WIFI_MODE == WIFI_STA) {
//                     WiFi.begin(pmgHub::config::WIFI_STA_SSID, pmgHub::config::WIFI_STA_PASSWORD);
//                 }
//                 else {
//                     WiFi.softAP(pmgHub::config::WIFI_AP_SSID, pmgHub::config::WIFI_AP_PASSWORD);
//                 }

//                 // Start the server only after the WiFi stack has initialized lwIP.
//                 _server.onNotFound([this]() { this->handleHTTPRequest(); });

//                 // Need to read Cookie header
//                 const char* headerKeys[] = { "Cookie" };
//                 _server.collectHeaders(headerKeys, 1);

//                 // Start the http server
//                 _server.begin();

};

void webServer::process() {

//                 uint32_t now = millis();
    
//                 //Check wifi connection
//                 if (now - _lastWifiCheckStatus >= CHECK_WIFI_EVERY) {

//                     _lastWifiCheckStatus = now;
//                     if (!_firstConnection) {

//                         if (WiFi.status() != WL_CONNECTED) {
//                             WiFi.reconnect();
//                         }

//                     }

//                 }

//                 //ServerWeb
//                 _server.handleClient();

};

esp_err_t webServer::webHandler(httpd_req_t *req) {


};

esp_err_t webServer::wsHandler(httpd_req_t *req) {


};

//             void handleHTTPRequest() {

//                 String path = _server.uri();
                
//                 // -------------------------------
//                 // ---- WEB
//                 // ----

//                 // ---------- STATIC ASSETS ----------

//                 Serial.println(path);

//                 const String& webFile = path;

//                 if (isWebFile(webFile)) {
//                     if (returnFile(webFile)) return;
//                 }

//                 const bool isAuth = isAuthenticated(_services.getSessions());

//                 // ----------  API PUBLIC ROUTES ----------

//                 if (path.startsWith("/api/")) {

//                     // ---------- API CREDENTIALS IS CREATED ?----------
//                     if (path == "/api/auth/status" && _server.method() == HTTP_GET) {

//                         String credentialsStatus = hasCredentials() ? "true" : "false";
//                         String json = "{\"initialized\":" + credentialsStatus + "}";
//                         _server.send(200, "application/json", json);
//                         return;

//                     }

//                     // ---------- API LOGOUT  ----------
//                     if (path == "/api/logout" && _server.method() == HTTP_GET) {
                        
//                         const String token = getSessionToken();

//                         if (token.isEmpty()) _services.getSessions().remove(token);

//                         clearSessionCookie();
//                         _server.send(200, "application/json", "{\"ok\":true}");
//                         return;

//                     }                    

//                 }

//                 // ----------  LOGIN REDIRECTION ----------                
//                 if (!isAuth) {

//                     if (path.startsWith("/api/")) {

//                         if (path == "/api/auth/initialize" && _server.method() == HTTP_POST) {

//                             String body = _server.arg("plain");
//                             JsonDocument doc;
//                             DeserializationError error = deserializeJson(doc, body);
//                             if (error) {
//                                 _server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
//                                 return;
//                             }  

//                             JsonVariantConst password = doc["password"];
//                             if (!password.is<const char*>() || password.as<const char*>()[0] == '\0') {
//                                 _server.send(400, "application/json", "{\"error\":\"INVALID_CREDENTIALS\"}");
//                                 return;
//                             }

//                             String passwordString = password.as<String>();

//                             // Save credentials
//                             if (!initializeCredentials(passwordString)) {
//                                 _server.send(409, "application/json", "{\"error\":\"FAILED_TO_SAVE_CREDENTIALS\"}");
//                                 return;
//                             }

//                             _server.send(200, "application/json", "{\"ok\":true}");
//                             return;

//                         }

//                         // ---------- API AUTHENTICATION - LOGIN  ----------
//                         if (path == "/api/login" && _server.method() == HTTP_POST) {

//                             String body = _server.arg("plain");
//                             JsonDocument doc;
//                             DeserializationError error = deserializeJson(doc, body);
//                             if (error) {
//                                 _server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
//                                 return;
//                             }  

//                             JsonVariantConst password = doc["password"];
//                             if (!password.is<const char*>() || password.as<const char*>()[0] == '\0') {
//                                 _server.send(400, "application/json", "{\"error\":\"INVALID_CREDENTIALS\"}");
//                                 return;
                            
//                             }

//                             if (!isValidPassword(password.as<String>())) {
//                                 _server.send(401, "application/json", "{\"error\":\"INVALID_CREDENTIALS\"}");
//                                 return;
//                             }   

//                             String token =  _services.getSessions().create(sessionManager::sessionType::webAdmin);
//                             setSessionCookie(token, pmgHub::config::sessionTimeoutMs);

//                             _server.send(200, "application/json", "{\"ok\":true}");

//                             return;

//                         }

//                         // ---------- ERROR ----------
//                         _server.send(500, "text/plain", "Internal server error (2)");
//                         return;                        

//                     }
//                     else {
                        
//                         if (path != "/login") {
//                             _server.sendHeader("Location", "/login");
//                             _server.send(302);
//                             return;
//                         }

//                     }

//                 }

//                 // ---------- DEFAULT PAGE ----------
//                 if (path == "/" && _server.method() == HTTP_GET) {
//                     returnFile("/index.html");
//                     return;
//                 }

//                 // ---------- LOGIN PAGE ----------
//                 if (path == "/login" && _server.method() == HTTP_GET) {
//                     if (isAuth) {
//                         // redirect to /
//                         _server.sendHeader("Location", "/");
//                         _server.send(302);
//                         return;
//                     }
//                     returnFile("/login.html");
//                     return;
//                 }
           
//                 _server.send(404, "text/plain", String("Not found: ") + path);

//             }
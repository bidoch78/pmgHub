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
            //Start the http server
            startHttpServer();
            break;

        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            Serial.println("[WiFi] Disconnected");
            break;

        default:
            break;
    }

};

bool webServer::returnFile(httpd_req_t* req, const String& uri) {

    if (!services.getStorage().isWebReady()) return false;

    LittleFSFS& web = services.getStorage().getWebFS();

    if (web.exists(uri)) {

        File file = web.open(uri, "r");

        // define MIME
        httpd_resp_set_type(req, getContentType(uri));

        char buffer[1024];
        while (file.available()) {
            size_t len = file.readBytes(buffer, sizeof(buffer));
            if (httpd_resp_send_chunk(req, buffer, len) != ESP_OK) {
                file.close();
                return false;
            }
        }

        file.close();

        // end of chunked
        httpd_resp_send_chunk(req, nullptr, 0);

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

    if (!service.getStorage().isWebReady()) return false;

    //Little tweak
    // API is not a file, so we don't want to serve it as a static file
    if (uri.startsWith("/api/")) return false;
    if (uri == "/login") return false;

    bool isFile = false;
    LittleFSFS& webFS = services.getStorage().getWebFS();

    if (webFS.exists(uri)) {
        File file = webFS.open(uri, "r");
        isFile = file && !file.isDirectory();
        file.close();
    }
    return isFile;

};

void webServer::initialize() {

    //WIFI
    WiFi.onEvent([this](WiFiEvent_t event, WiFiEventInfo_t info) { this->onWiFiEvent(event, info); });
    WiFi.mode(pmgHub::config::WIFI_MODE);

    if (pmgHub::config::WIFI_MODE == WIFI_STA) {
        WiFi.begin(pmgHub::config::WIFI_STA_SSID, pmgHub::config::WIFI_STA_PASSWORD);
    }
    else {
        WiFi.softAP(pmgHub::config::WIFI_AP_SSID, pmgHub::config::WIFI_AP_PASSWORD);
    }

};

void webServer::startHttpServer() {

    if (_server != nullptr) return;

    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.uri_match_fn = httpd_uri_match_wildcard;

    if (httpd_start(&_server, &config) != ESP_OK) {
        _server = nullptr;
        Serial.println("Unable to start HTTP server");
        return;
    }

    //Routes
    httpd_uri_t httpGetUri = {
        .uri      = "/*",
        .method   = HTTP_GET,
        .handler  = httpUriHandler,
        .user_ctx = this
    };

    if (httpd_register_uri_handler(_server, &httpGetUri) != ESP_OK) {
        Serial.println("Unable to register HTTP handler");
    }

    httpd_uri_t httpPOSTUri = {
        .uri      = "/*",
        .method   = HTTP_POST,
        .handler  = httpUriHandler,
        .user_ctx = this
    };

    if (httpd_register_uri_handler(_server, &httpPOSTUri) != ESP_OK) {
        Serial.println("Unable to register HTTP handler");
    }

}

void webServer::process() {

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

};

esp_err_t webServer::httpUriHandler(httpd_req_t* req) {
    
    //Becasue it's static function we get the context and execute webHandler to retrieve context
    webServer* self = static_cast<webServer*>(req->user_ctx);
    return self->webHandler(req);

}

esp_err_t webServer::webHandler(httpd_req_t *req) {

    String path = req->uri;

    // -------------------------------
    // ---- WEB
    // ----

    // ---------- STATIC ASSETS ----------

    Serial.println(path);

    const String& webFile = path;

    if (isWebFile(webFile)) {
        returnFile(req, webFile); 
        return ESP_OK;
    }

    //const bool isAuth = isAuthenticated(_services.getSessions());
    const bool isAuth = false;

    // ----------  API PUBLIC ROUTES ----------
    if (path.startsWith("/api/")) {

        // ---------- API CREDENTIALS IS CREATED ?----------
        if (path == "/api/auth/status" && req->method == HTTP_GET) {

//                         String credentialsStatus = hasCredentials() ? "true" : "false";
//                         String json = "{\"initialized\":" + credentialsStatus + "}";
//                         _server.send(200, "application/json", json);
            return ESP_OK;
        }

        // ---------- API LOGOUT  ----------
        if (path == "/api/logout" && req->method == HTTP_GET) {
                        
//                         const String token = getSessionToken();

//                         if (token.isEmpty()) _services.getSessions().remove(token);

//                         clearSessionCookie();
//                         _server.send(200, "application/json", "{\"ok\":true}");
            return ESP_OK;

        }                    

    }

    // ----------  LOGIN REDIRECTION ----------                
    if (!isAuth) {

        if (path.startsWith("/api/")) {

            if (path == "/api/auth/initialize" && req->method == HTTP_POST) {

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

            }

            // ---------- API AUTHENTICATION - LOGIN  ----------
            if (path == "/api/login" && req->method == HTTP_POST) {

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

            }

            // ---------- ERROR ----------
            httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Internal Server Error (2)");
            return ESP_OK;                    

        }
        else {
                    
            if (path != "/login") {
                httpd_resp_set_status(req, "302 Found");
                httpd_resp_set_hdr(req, "Location", "/login");
                httpd_resp_send(req, nullptr, 0);
                return ESP_OK;
            }

        }

    }

    // ---------- DEFAULT PAGE ----------
    if (path == "/" && req->method == HTTP_GET) {
        returnFile(req, "/index.html");
        return ESP_OK;
    }

    // ---------- LOGIN PAGE ----------
    if (path == "/login" && req->method == HTTP_GET) {
        if (isAuth) {
            // redirect to /
            httpd_resp_set_status(req, "302 Found");
            httpd_resp_set_hdr(req, "Location", "/");
            httpd_resp_send(req, nullptr, 0);
            return ESP_OK;
        }
        returnFile(req, "/login.html");
        return ESP_OK;
    }

    httpd_resp_send_err(req, HTTPD_404_NOT_FOUND, (String("Not found: ") + path).c_str());

    return ESP_OK;

};

esp_err_t webServer::wsHandler(httpd_req_t *req) {

    return ESP_OK;

};

//             void handleHTTPRequest() {

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
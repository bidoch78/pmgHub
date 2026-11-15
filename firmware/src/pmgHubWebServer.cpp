#include <pmgHubWebServer.h>
#include <pmgHubServices.h>

#include <esp_http_server.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

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

    if (!_services.getStorage().isWebReady()) return false;

    fs::LittleFSFS& web = _services.getStorage().getWebFS();

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

};      

bool webServer::isWebFile(const String& uri) {

    if (!_services.getStorage().isWebReady()) return false;

    //Little tweak
    // API is not a file, so we don't want to serve it as a static file
    if (uri.startsWith("/api/")) return false;
    if (uri == "/login") return false;
    if (uri == "/logout") return false;
    if (uri.startsWith("/ws/")) return false;

    bool isFile = false;
    fs::LittleFSFS& webFS = _services.getStorage().getWebFS();

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

esp_err_t webServer::sendJson(httpd_req_t* req, const String& json) {
    httpd_resp_set_type(req, "application/json; charset=utf-8");
    return httpd_resp_send(req, json.c_str(), json.length());
};

bool webServer::getPostData(httpd_req_t* req, String& data)
{
    data.clear();

    if (req == nullptr) return false;

    const size_t contentLen = req->content_len;

    if (contentLen == 0) return false;

    if (contentLen > pmgHub::config::webServerMaxBodySize) {
        httpd_resp_set_status(req, "413 Payload Too Large");
        httpd_resp_set_type(req, "application/json");
        httpd_resp_sendstr(req, "{\"error\":\"PAYLOAD_TOO_LARGE\"}");
        return false;
    }

    char* buffer = static_cast<char*>(malloc(contentLen + 1));

    if (buffer == nullptr) {
        httpd_resp_set_status(req, "500 Internal Server Error");
        httpd_resp_set_type(req, "application/json");
        httpd_resp_sendstr(req, "{\"error\":\"OUT_OF_MEMORY\"}");
        return false;
    }

    size_t totalReceived = 0;
    uint32_t timeoutCount = 0;

    while (totalReceived < contentLen) {

        const size_t remaining = contentLen - totalReceived;

        const int received = httpd_req_recv(req, buffer + totalReceived, remaining);

        if (received == HTTPD_SOCK_ERR_TIMEOUT) {
            timeoutCount++;

            if (timeoutCount >= 5) {
                free(buffer);
                httpd_resp_set_status(req, "408 Request Timeout");
                httpd_resp_set_type(req, "application/json");
                httpd_resp_sendstr(req, "{\"error\":\"REQUEST_TIMEOUT\"}");
                return false;
            }

            continue;
        }

        if (received <= 0) {
            free(buffer);
            return false;
        }

        timeoutCount = 0;
        totalReceived += static_cast<size_t>(received);
    }

    buffer[totalReceived] = '\0';

    data = String(buffer, totalReceived);

    free(buffer);

    return true;
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

void webServer::startHttpServer() {

    if (_server != nullptr) return;

    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.stack_size = 8192;
    config.server_port = 80;
    config.uri_match_fn = httpd_uri_match_wildcard;
    config.close_fn = closeCallback;

    if (httpd_start(&_server, &config) != ESP_OK) {
        _server = nullptr;
        Serial.println("Unable to start HTTP server");
        return;
    }

    httpd_uri_t wsAdmin = {
        .uri      = "/ws/admin",
        .method   = HTTP_GET,
        .handler  = webSocketHandler,
        .user_ctx = this,
        .is_websocket = true
    };

    if (httpd_register_uri_handler(_server, &wsAdmin) != ESP_OK) {
        Serial.println("Unable to register WebSocket admin handler");
    }

    httpd_uri_t httpGetUri = {
        .uri      = "/*",
        .method   = HTTP_GET,
        .handler  = httpUriHandler,
        .user_ctx = this
    };

    if (httpd_register_uri_handler(_server, &httpGetUri) != ESP_OK) {
        Serial.println("Unable to register HTTP handler 1");
    }

    httpd_uri_t httpPOSTUri = {
        .uri      = "/*",
        .method   = HTTP_POST,
        .handler  = httpUriHandler,
        .user_ctx = this
    };

    if (httpd_register_uri_handler(_server, &httpPOSTUri) != ESP_OK) {
        Serial.println("Unable to register HTTP handler 2");
    }

};

esp_err_t webServer::httpUriHandler(httpd_req_t* req) {
    
    //Becasue it's static function we get the context and execute webHandler to retrieve context
    webServer* self = static_cast<webServer*>(req->user_ctx);
    return self->webHandler(req);

};

esp_err_t webServer::webHandler(httpd_req_t *req) {

    String path = req->uri;

    // -------------------------------
    // ---- WEB
    // ----

    // ---------- STATIC ASSETS ----------

    Serial.println("[HTTP] Request: " + path);

    const String& webFile = path;

    if (isWebFile(webFile)) {
        returnFile(req, webFile); 
        return ESP_OK;
    }

    const bool isAuth = _webAuth.isAuthenticated(req);

    // ----------  API PUBLIC ROUTES ----------
    if (path.startsWith("/api/")) {

        // ---------- API CREDENTIALS IS CREATED ?----------
        if (path == "/api/auth/status" && req->method == HTTP_GET) {
            String credentialsStatus = _webCredentials.hasCredentials() ? "true" : "false";
            String json = "{\"initialized\":" + credentialsStatus + "}";
            return sendJson(req, json);
        }

        // ---------- API LOGOUT  ----------
        if (path == "/api/logout" && req->method == HTTP_POST) {
            const String token = _webAuth.getSessionToken(req);
            if (!token.isEmpty()) _services.getSessions().remove(token);
            String cookie = _webAuth.clearSessionCookie();
            httpd_resp_set_hdr(req, "Set-Cookie", cookie.c_str());
            String json = "{\"ok\":true}";
            return sendJson(req, json);
        }                    

    }

    // ----------  LOGIN REDIRECTION ----------                
    if (!isAuth) {

        if (path.startsWith("/api/")) {

            if (path == "/api/auth/initialize" && req->method == HTTP_POST) {

                String body;
                if (!getPostData(req, body)) return ESP_FAIL;

                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, body);
                if (error) {
                    httpd_resp_set_status(req, "400 Bad Request");
                    httpd_resp_set_type(req, "application/json");
                    httpd_resp_sendstr(req, "{\"error\":\"Invalid JSON\"}");
                    return ESP_OK;
                }

                JsonVariantConst password = doc["password"];
                if (!password.is<const char*>() || password.as<const char*>()[0] == '\0') {
                    httpd_resp_set_status(req, "400 Bad Request");
                    httpd_resp_set_type(req, "application/json");
                    httpd_resp_sendstr(req, "{\"error\":\"INVALID_CREDENTIALS\"}");
                    return ESP_OK;
                }

                String passwordString = password.as<String>();

                // Save credentials
                if (!_webCredentials.initializeCredentials(passwordString)) {
                    httpd_resp_set_status(req, "400 Bad Request");
                    httpd_resp_set_type(req, "application/json");
                    httpd_resp_sendstr(req, "{\"error\":\"FAILED_TO_SAVE_CREDENTIALS\"}");
                    return ESP_OK;
                }

                String json = "{\"ok\":true}";
                return sendJson(req, json);

            }

            // ---------- API AUTHENTICATION - LOGIN  ----------
            if (path == "/api/login" && req->method == HTTP_POST) {

                String body;
                if (!getPostData(req, body)) return ESP_FAIL;

                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, body);
                if (error) {
                    httpd_resp_set_status(req, "400 Bad Request");
                    httpd_resp_set_type(req, "application/json");
                    httpd_resp_sendstr(req, "{\"error\":\"Invalid JSON\"}");
                    return ESP_OK;
                }  

                JsonVariantConst password = doc["password"];
                if (!password.is<const char*>() || password.as<const char*>()[0] == '\0') {
                    httpd_resp_set_status(req, "400 Bad Request");
                    httpd_resp_set_type(req, "application/json");
                    httpd_resp_sendstr(req, "{\"error\":\"INVALID_CREDENTIALS\"}");
                    return ESP_OK;
                }

                if (!_webCredentials.isValidPassword(password.as<String>())) {
                    httpd_resp_set_status(req, "400 Bad Request");
                    httpd_resp_set_type(req, "application/json");
                    httpd_resp_sendstr(req, "{\"error\":\"INVALID_CREDENTIALS\"}");
                    return ESP_OK;
                }

                Serial.println("Login successful");

                String token = _services.getSessions().create(sessionManager::sessionType::webAdmin);
                String cookie = _webAuth.setSessionCookie(token, pmgHub::config::sessionTimeoutMs);
                httpd_resp_set_hdr(req, "Set-Cookie", cookie.c_str());

                String json = "{\"ok\":true}";
                return sendJson(req, json);
                
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

esp_err_t webServer::webSocketHandler(httpd_req_t* req) {

    //Becasue it's static function we get the context and execute webHandler to retrieve context
    webServer* self = static_cast<webServer*>(req->user_ctx);
    return self->wsHandler(req);    

}

esp_err_t webServer::wsHandler(httpd_req_t *req) {

    if (req->method == HTTP_GET && !_webAuth.isAuthenticated(req)) {
        return ESP_FAIL;
    }

    Serial.printf("[WebSocket] Request: %s\n", req->uri);

    int fd = httpd_req_to_sockfd(req);

    // Handshake WebSocket
    if (req->method == HTTP_GET) {

        Serial.printf(
            "WebSocket connected: path=%s fd=%d\n",
            req->uri,
            fd
        );

        return ESP_OK;
    }

    httpd_ws_frame_t frame = {};
    esp_err_t ret = httpd_ws_recv_frame(req, &frame, 0);

    if (ret != ESP_OK) {
        Serial.printf(
            "httpd_ws_recv_frame error: %s\n",
            esp_err_to_name(ret)
        );
        return ret;
    }

    if (frame.type != HTTPD_WS_TYPE_TEXT) {
        Serial.printf("Ignoring non-text WebSocket frame (type=%d)\n", frame.type);
        return ESP_OK;
    }

    if (frame.len == 0) return ESP_OK;

    if (frame.len > pmgHub::config::webServerMaxBodySize) {
        Serial.printf("WebSocket frame too large: %u bytes\n", static_cast<unsigned int>(frame.len));
        return ESP_FAIL;
    }

    uint8_t* payload = static_cast<uint8_t*>(malloc(frame.len + 1));
    if (payload == nullptr) return ESP_ERR_NO_MEM;

    frame.payload = payload;
    ret = httpd_ws_recv_frame(req, &frame, frame.len);
    if (ret != ESP_OK) {
        free(payload);
        Serial.printf("httpd_ws_recv_frame payload error: %s\n", esp_err_to_name(ret));
        return ret;
    }

    payload[frame.len] = '\0';

    JsonDocument doc;
    DeserializationError error = deserializeJson(
        doc,
        reinterpret_cast<const char*>(payload),
        frame.len
    );
    free(payload);

    if (error || !doc.is<JsonObject>() || !doc["type"].is<const char*>()) {
        Serial.println("Invalid WebSocket JSON command");
        return ESP_OK;
    }

    const char* type = doc["type"].as<const char*>();
    if (strcmp(type, "webadmin.init") == 0) {
        Serial.println("WebSocket command received: webadmin.init");

        uint8_t response[] = "{\"type\":\"hello\",\"data\":[]}";
        httpd_ws_frame_t responseFrame = {};
        responseFrame.type = HTTPD_WS_TYPE_TEXT;
        responseFrame.payload = response;
        responseFrame.len = sizeof(response) - 1;

        ret = httpd_ws_send_frame(req, &responseFrame);
        if (ret != ESP_OK) {
            Serial.printf("httpd_ws_send_frame error: %s\n", esp_err_to_name(ret));
        }

        Serial.printf("[webSocket] Sent response: ret=%s fd=%d len=%u", esp_err_to_name(ret), httpd_req_to_sockfd(req), static_cast<unsigned int>(responseFrame.len));

        return ret;
    }

    Serial.printf("Unknown WebSocket command: %s\n", type);

    return ESP_OK;

};

void webServer::closeCallback(httpd_handle_t hd, int sockfd) {

    Serial.printf("close socket callback: sockfd=%d\n", sockfd);

    //ESP_LOGI(TAG, "Socket %d closed", sockfd);
    // ...

    close(sockfd); // Close the socket to free resources

};
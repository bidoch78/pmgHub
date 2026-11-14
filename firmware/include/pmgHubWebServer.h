#pragma once

// #include <pmgHubConfig.h>
#include <WiFi.h>
#include <LittleFS.h>
// #include <WebServer.h>
// #include <pmgHubServices.h>
#include <pmgHubSessionManager.h>
#include <pmgHubWebAuth.h>
#include <pmgHubWebCredentials.h>
#include <esp_http_server.h>

// #include <ArduinoJson.h>
// #include <pmgHubCryptoManager.h>

namespace pmgHub {

    class webServer {

        private:

            static constexpr uint32_t CHECK_WIFI_EVERY = 5000;

            uint32_t _lastWifiCheckStatus = 0;
            bool _firstConnection = true;
            
            services& _services;
            httpd_handle_t _server = nullptr;
            webAuth _webAuth;
            webCredentials _webCredentials;

            void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info);
            const char* getContentType(const String& path);

            bool isWebFile(const String& uri);
            bool returnFile(httpd_req_t* req, const String& uri);
            void startHttpServer();

            esp_err_t sendJson(httpd_req_t* req, const String& json);
            esp_err_t webHandler(httpd_req_t *req);
            esp_err_t wsHandler(httpd_req_t *req);

            static esp_err_t httpUriHandler(httpd_req_t* req);

        public:

            webServer(services& svc) : _services(svc), _webAuth(svc), _webCredentials(svc) {}

            void initialize();
            void process();

    };

};
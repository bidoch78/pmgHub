#pragma once

// #include <pmgHubConfig.h>
#include <WiFi.h>
// #include <LittleFS.h>
// #include <WebServer.h>
// #include <pmgHubServices.h>
// #include <pmgHubSessionManager.h>
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

            void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info);
            const char* getContentType(const String& path);

            bool returnFile(const String& uri);

            esp_err_t webHandler(httpd_req_t *req);
            esp_err_t wsHandler(httpd_req_t *req);

        public:

            webServer(services& services) : _services(services) {}

            void initialize();
            void process();

    };

};
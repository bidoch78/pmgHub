#pragma once

#include <WiFi.h>
#include <LittleFS.h>
#include <pmgHubSessionManager.h>
#include <pmgHubWebAuth.h>
#include <pmgHubWebCredentials.h>
#include <esp_http_server.h>
#include <pmgHubWebSocket.h>

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

            bool getPostData(httpd_req_t* req, String& data);
            esp_err_t sendJson(httpd_req_t* req, const String& json);
            esp_err_t webHandler(httpd_req_t *req);
            esp_err_t wsHandler(httpd_req_t *req);
            esp_err_t wsConnection(httpd_req_t *req, int fd);

            static esp_err_t httpUriHandler(httpd_req_t* req);
            static esp_err_t webSocketHandler(httpd_req_t* req);
            static void closeCallback(httpd_handle_t hd, int sockfd);

            webSocket* getWebSocket(int fd);
                
            std::map<int, webSocket> _webSockets; 

        public:

            webServer(services& svc) : _services(svc), _webAuth(svc), _webCredentials(svc) {}
            ~webServer() = default;

            void initialize();
            void process();

    };

};
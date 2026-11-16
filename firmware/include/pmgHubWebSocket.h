#pragma once

#include <functional>
#include <Arduino.h>
#include <esp_http_server.h>
#include <map>
// #include <ArduinoJson.h>
// #include <pmgHubCryptoManager.h>

namespace pmgHub {

    class webSocket {

        public:

            enum class state : uint8_t {
                CONNECTING,
                OPEN,
                CLOSING,
                CLOSED
            };
        
            using MessageCallback = std::function<void(const String&)>;
            using CloseCallback   = std::function<void(int32_t, const String&)>;

        private:

            uint32_t _listenerId = 0;

            int32_t _socketfd = -1;
            httpd_handle_t _server = nullptr;
            state _state = state::CLOSED;

            std::map<uint32_t, MessageCallback> _messageCallbacks;
            std::map<uint32_t, CloseCallback> _closeCallbacks;
            
        public:

            webSocket() = default;
            webSocket(httpd_handle_t server, int32_t socketfd);
            
            int32_t getSocketFd() const;
            bool isConnected() const;
            state getReadyState() const;

            void attach(httpd_handle_t server, int32_t socketfd);
            esp_err_t send(const String& message);
            esp_err_t close(uint16_t code = 1000, const String& reason = "");

            uint32_t onMessage(MessageCallback callback);
            uint32_t onClose(CloseCallback callback);

            void removeMessageListener(uint32_t id);
            void removeCloseListener(uint32_t id);

            void dispatchMessage(const String& message);
            void dispatchClose(int32_t code, const String& reason);

    };

};
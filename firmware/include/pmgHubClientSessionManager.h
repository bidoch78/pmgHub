#pragma once

#include <pmgHubServicesBase.h>
#include <pmgHubClientSession.h>
#include <map>
#include <Arduino.h>
#include <pmgHubDevice.h>
#include <pmgHubWebSocket.h>

namespace pmgHub {

    class wsClientSessionManager : public servicesBase {

        private:

            uint32_t _pingInterval = 0;
            uint32_t _pongTimeout = 0;
            uint32_t _checkInterval = 0;
            uint32_t _authenticationTimeout = 0;
            uint32_t _lastHeartBeatCall = 0;

            struct cSocketData {
                wsClientSession clientSession;
                uint32_t lastPing;
                uint32_t lastPong;
                bool awaitingPong;
                uint32_t pongDeadline;
                uint32_t nextPing;
                uint32_t createdAt;
                cSocketData(webSocket& ws, device& dv, uint32_t pingInterval): clientSession(ws, dv) {
                    uint32_t now = millis();
                    lastPing = 0;
                    lastPong = now;
                    pongDeadline = 0;
                    nextPing = now + pingInterval;
                    createdAt = now;
                    awaitingPong = false;
                }
            };

            std::map<String, cSocketData> _cSockets;

            cSocketData* getBySocketFD(int socketfd);

        public:

            wsClientSessionManager(uint32_t pingInterval, uint32_t pongTimeout, uint32_t checkInterval, uint32_t authenticationTimeout):
                    _pingInterval(pingInterval), _pongTimeout(pongTimeout), _checkInterval(checkInterval), _authenticationTimeout(authenticationTimeout) {}
            
            ~wsClientSessionManager() = default;

            wsClientSession& add(webSocket& ws, device& dv);

            bool close(const String& clientUID, uint32_t error = 0, const String& message);
            bool remove(const String& clientUID);
            
            void checkHeartbeat();

            wsClientSession* getById(const String& clientUID);

            void broadcastToWebAdmin(const String& message);
            void sendToDevice(const String& clientUID, const String& message);

            uint32_t countSessions();


    };

};
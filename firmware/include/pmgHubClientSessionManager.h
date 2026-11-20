#pragma once

#include <pmgHubServicesBase.h>
#include <pmgHubClientSession.h>
#include <map>

namespace pmgHub {

    class wsClientSessionManager : public servicesBase {

        private:

            uint32_t _pingInterval = 0;
            uint32_t _pongTimeout = 0;
            uint32_t _checkInterval = 0;
            uint32_t _authenticationTimeout = 0;
            uint32_t _lastHeartBeatCall = 0;

            std::map<String, wsClientSession> _cSockets;

        public:

            wsClientSessionManager(uint32_t pingInterval, uint32_t pongTimeout, uint32_t checkInterval, uint32_t authenticationTimeout):
                    _pingInterval(pingInterval), _pongTimeout(pongTimeout), _checkInterval(checkInterval), _authenticationTimeout(authenticationTimeout) {}
            
            ~wsClientSessionManager() = default;

            //void add(const device& dev, )

    };

};
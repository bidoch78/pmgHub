#pragma once

#include <pmgHubDevice.h>
#include <pmgHubWebSocket.h>

namespace pmgHub {

    class wsClientSession {

        private:

            device& _device;
            webSocket& _ws;

        public:

            wsClientSession(webSocket& ws, device& dv): _ws(ws), _device(dv) {}
            ~wsClientSession() = default;

            device& getDevice();
            webSocket& getWebSocket();

    };

};
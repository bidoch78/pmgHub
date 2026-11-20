#pragma once

#include <pmgHubDevice.h>
#include <pmgHubWebSocket.h>

namespace pmgHub {

    class wsClientSession {

        private:

            const device& _device;
            const webSocket& _ws;

        public:

            wsClientSession(const webSocket& ws, const device& dv): _ws(ws), _device(dv) {}
            ~wsClientSession() = default;

            device& getDevice();
            webSocket& getWebSocket();

    };

};
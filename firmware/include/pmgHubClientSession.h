#pragma once

namespace pmgHub {

    class wsClientSession {

        private:

            device& _device;
            webSocket& _ws;

        public:

            wsClientSession(const webSocket& ws, const device& dv): _ws(ws), _device(device) {}
            ~wsClientSession() = default;

    };

};
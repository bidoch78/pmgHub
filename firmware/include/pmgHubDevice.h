#pragma once

#include <pmgHubServices.h>

namespace pmgHub {

    class device {

        private:

            String _uid;
            String _token;
            String _name;
            string _mac;
            string _nonce;

            bool _isWebAdmin = false;
            bool _listenSensors = false;
            bool _connected = false;
            bool _pairing = false;
            bool _persistent = false;

            services _service;

            // std::map<> _sensors
            // std::map<> _typeUnits
            
        public:

            device(services& svc);
            ~device() = default;

    };

};
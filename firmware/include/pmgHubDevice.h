#pragma once

#include <Arduino.h>
#include <pmgHubServicesBase.h>

namespace pmgHub {

    class device : public servicesBase {

        private:

            String _uid;
            String _token;
            String _name;
            String _mac;
            String _nonce;

            bool _isWebAdmin = false;
            bool _listenSensors = false;
            bool _connected = false;
            bool _pairing = false;
            bool _persistent = false;

            // std::map<> _sensors
            // std::map<> _typeUnits
            
        public:

            device();
            device(String token);

            ~device() = default;

            const String& getUID() const;

    };

};
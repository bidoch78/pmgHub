#pragma once

#include <Arduino.h>
#include <pmgHubServicesBase.h>

namespace pmgHub {

    class device : public servicesBase {

        private:

            String _uid;
            String _token;
            bool _isWebAdmin = false;
            bool _listenSensors = false;
            bool _connected = false;
            bool _pairing = false;
            bool _persistent = false;
            String _name;
            String _mac;
            //std::map<> _sensors
            // std::map<> _typeUnits
            String _nonce;
            
        public:

            device();
            device(String token);

            ~device() = default;

            const String& getUID() const;
            const String& getMAC() const; 

            void setMAC(const String mac);

};

}
#pragma once

#include <Arduino.h>
#include <pmgHubServicesBase.h>

namespace pmgHub {

    class devices : public servicesBase {

        private:

            std::map<String, device> _devices;
            
        public:

            devices();
            ~devices() = default;

            device& registerWebAdmin(const String token);
            device& registerDevice();

    };
    
};
#pragma once

#include <pmgHubServices.h>
#include <ArduinoJson.h>

namespace pmgHub {

    class webCredentials {

        private:

            services& _services;

            JsonDocument readCredentials();

        public:

            webCredentials(services& svc) : _services(svc) {}

            bool hasCredentials();
            bool isValidPassword(const String& password);
            bool initializeCredentials(const String& password);


    };

};
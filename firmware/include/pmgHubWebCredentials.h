#pragma once

#include <pmgHubServices.h>
#include <ArduinoJson.h>

namespace pmgHub {

    class webCredentials {

        private:

            service& _services;

            JsonDocument readCredentials();

            bool hasCredentials();
            bool isValidPassword(const String& password);
            bool initializeCredentials(const String& password);

        public:

            webCredentials() : _services(services) {}

    };

};
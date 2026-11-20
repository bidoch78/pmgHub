#pragma once

#include <pmgHubClientSessionManager.h>
#include <pmgHubSessionManager.h>
#include <pmgHubStorage.h>
#include <pmgHubSensors.h>
#include <pmgHubDevices.h>

namespace pmgHub {

    class services {

        private:

            sessionManager& _sessions;
            storage& _storage;
            sensors& _sensors;
            wsClientSessionManager& _csManager;
            devices& _devices;

        public:

            services(sessionManager& ssessions, storage& sstorage, sensors& ssensors, wsClientSessionManager& wsclientsm, devices& sdevices)
                : _sessions(ssessions), _storage(sstorage), _sensors(ssensors), _csManager(wsclientsm), _devices(sdevices) {
                ssessions.setServices(*this);
                wsclientsm.setServices(*this);
                sdevices.setServices(*this);
            }
            ~services() = default;

            sessionManager& getSessions() { return _sessions; }
            storage& getStorage() { return _storage; }
            sensors& getSensors() { return _sensors; }
            wsClientSessionManager& getCSManager() { return _csManager;  }
            devices& getDevices() { return _devices; }

    };

};
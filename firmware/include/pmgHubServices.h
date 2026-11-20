#pragma once

#include <pmgHubClientSessionManager.h>
#include <pmgHubSessionManager.h>
#include <pmgHubStorage.h>
#include <pmgHubSensors.h>

namespace pmgHub {

    class services {

        private:

            sessionManager& _sessions;
            storage& _storage;
            sensors& _sensors;
            wsClientSessionManager& _csManager;

        public:

            services(sessionManager& ssessions, storage& sstorage, sensors& ssensors, wsClientSessionManager& wsclientsm) : _sessions(ssessions), _storage(sstorage), _sensors(ssensors), _csManager(wsclientsm) {
                ssessions.setServices(*this);
            }
            ~services() = default;

            sessionManager& getSessions() { return _sessions; }
            //const sessionManager& getSessions() const { return _sessions; }

            storage& getStorage() { return _storage; }
            //const storage& getStorage() const { return _storage; }

            sensors& getSensors() { return _sensors; }
            //const sensors& getSensors() const { return _sensors; }

            wsClientSessionManager& getCSManager() { return _csManager;  }
        
    };

};
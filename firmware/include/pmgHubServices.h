#pragma once

#include <pmgHubSessionManager.h>
#include <pmgHubStorage.h>
#include <pmgHubSensors.h>

namespace pmgHub {

    class services {

        private:

            sessionManager& _sessions;
            storage& _storage;
            sensors& _sensors;

        public:

            services(sessionManager& ssessions, storage& sstorage, sensors& ssensors) : _sessions(ssessions), _storage(sstorage), _sensors(ssensors) {
                ssessions.setServices(*this);
            }
            ~services() = default;

            sessionManager& getSessions() { return _sessions; }
            //const sessionManager& getSessions() const { return _sessions; }

            storage& getStorage() { return _storage; }
            //const storage& getStorage() const { return _storage; }

            sensors& getSensors() { return _sensors; }
            //const sensors& getSensors() const { return _sensors; }
        
    };

};
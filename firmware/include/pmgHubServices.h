#pragma once

#include <pmgHubConfig.h>
#include <pmgHubSessionManager.h>
#include <pmgHubStorage.h>

namespace pmgHub {

    class services {

        private:

            sessionManager _sessions;
            storage _storage;

        public:

            services() : _sessions(*this, pmgHub::config::sessionTimeoutMs), _storage() {}
         
            sessionManager& getSessions() { return _sessions; }
            storage& getStorage() { return _storage; }
        
    };

};
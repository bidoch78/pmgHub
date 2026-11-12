#pragma once

#include <pmgHubConfig.h>
#include <pmgHubSessionManager.h>

namespace pmgHub {

    class services {

        private:

            sessionManager _sessions;

        public:

            services() : _sessions(*this, pmgHub::config::sessionTimeoutMs) {}
         
            sessionManager& getSessions() { return _sessions; }
        
    };

};
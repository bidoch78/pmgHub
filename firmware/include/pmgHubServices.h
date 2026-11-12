#pragma once

#include <pmgHubConfig.h>
#include <pmgHubSessions.h>

namespace pmgHub {

    class Services {

        private:

            Sessions& _sessions;

        public:

            Services():   {
                _sessions = new Sessions(this, pmgHub::config::sessionTimeoutMs);
            }
         
            Sessions& getSessions() const { return _sessions; }
        
    };

};
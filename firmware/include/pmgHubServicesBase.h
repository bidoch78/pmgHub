#pragma once

#include <pmgHubServices.h>

namespace pmgHub {

    class servicesBase {

        friend class services;

        private:

            void setServices(services& srv) { _services = &srv; };

        protected:

            services* _services = nullptr;
            
        public:

            servicesBase() = default;
            ~servicesBase() = default;

    };

};
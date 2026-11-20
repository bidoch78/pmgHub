#pragma once

namespace pmgHub {

    class services;
    
    class servicesBase {

        protected:

            services* _services = nullptr;
            
        public:

            servicesBase() = default;
            ~servicesBase() = default;

            void setServices(services& srv) { _services = &srv; };

    };

};
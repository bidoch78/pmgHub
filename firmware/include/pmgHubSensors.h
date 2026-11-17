#pragma once

#include <pmgHubServices.h>
#include <pmgHubSensor.h>
#include <pmgHubUnits.h>

namespace pmgHub {

    class sensors {

        private:

            services _service;

//             uint32_t _lastUpdate = 0;

            units _units;
            std::map<sensor::sensorId, sensor> _sensors;
            
        public:

            sensors(services& svc);
            ~sensors() = default;

//             sensor find(sensor::sensorID) const;
            
//             void update();

//             void retrieveSensors(std::map<sensor::sensorID, sensor> sensors) = 0;

//     };

};
#pragma once

#include <pmgHubSensor.h>
#include <pmgHubUnits.h>

namespace pmgHub {

    class sensors {

        private:

//             uint32_t _lastUpdate = 0;

            units _units;
            std::map<sensor::sensorId, sensor> _sensors;
            
        public:

            sensors();
            ~sensors() = default;

//             sensor find(sensor::sensorID) const;
            
//             void update();

//             void retrieveSensors(std::map<sensor::sensorID, sensor> sensors) = 0;

    };

};
#pragma once

#include <pmgHubSensor.h>
#include <pmgHubUnits.h>

namespace pmgHub {

    class sensors {

        private:

            uint32_t _lastUpdate = 0;

            units _units;
            std::map<sensor::sensorId, sensor> _sensors;
            
        public:

            sensors();
            ~sensors() = default;

            const sensor* find(sensor::sensorId sid) const;
            
            void update();
            void retrieveSensors(const std::map<sensor::sensorId, sensor>& sensors) = 0;

    };

};
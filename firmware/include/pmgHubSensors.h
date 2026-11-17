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
            virtual ~sensors() = default;

            sensor* find(sensor::sensorId sid);
            const sensor* find(sensor::sensorId sid) const;
            
            void update();
            virtual void retrieveSensors(const std::map<sensor::sensorId, sensor>& sensors) = 0;

    };

};
#pragma once

#include <pmgHubSensors.h>

namespace pmgHub {

    class sensorsSimulator : public sensors {

        public:

            sensorsSimulator();
            ~sensorsSimulator() = default;
            
            void retrieveSensors(const std::map<sensor::sensorId, sensor>& sensors) override;

        };

};
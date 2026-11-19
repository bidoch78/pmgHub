#pragma once

#include <pmgHubSensors.h>
#include <vector>

namespace pmgHub {

    class sensorsSimulator : public sensors {

        public:

            enum class simDataType: uint32_t {
                SIM_RANGE = 0,
                SIM_PULL = 1,
                SIM_VIRTUAL = 2
            };

            struct sensorSimData {
                simDataType type;
                const std::vector<float> in;
                const std::vector<float> out;
                sensorSimData(simDataType stype, std::vector<float> sin, std::vector<float> sout): type(stype), in(std::move(sin)), out(std::move(sout)) {  }
            };

        private:

            std::map<sensor::sensorId, sensorSimData> _simData;

        public:

            sensorsSimulator();
            ~sensorsSimulator() = default;
            
            void retrieveSensors(const std::vector<sensor*>& sensors) override;

            const sensorSimData* getSimData(sensor::sensorId id) const;
            static float randomFloat(float min, float max);
            static float randomBool(float min, float max);
            static float convertLinar(float value, float inMin, float inMax, flat outMin, flat outMax);

        };

};
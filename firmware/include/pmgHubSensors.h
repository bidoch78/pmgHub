#pragma once

#include <pmgHubSensor.h>
#include <pmgHubUnits.h>

namespace pmgHub {

    class sensors {

        private:

            uint32_t _lastUpdate = 0;

            units _units;
            std::map<sensor::sensorId, sensor> _sensors;
            
            void generateTransGearSel(sensor* const sensor);
            void generateTransSelector(sensor* const sensor);
            void generateFuelLowLevel(sensor* const sensor);

        public:

            sensors();
            virtual ~sensors() = default;

            sensor* find(sensor::sensorId sid);
            const sensor* find(sensor::sensorId sid) const;
            
            void update();
            virtual void retrieveSensors(const std::vector<sensor*>& sensors) = 0;
            
            static float roundValue(float value, uint32_t decimals);
            static units::sensorValue convertFloatToSensorValue(float value, const units::unitData& unit);
        
            template<typename T>
            T getSensorValue(sensor::sensorId sId, T defaultValue) const {
                const sensor* s = find(sId);
                if (s == nullptr) return defaultValue;
                return units::getValue<T>(s->getValue(), defaultValue);
            }

    };

};
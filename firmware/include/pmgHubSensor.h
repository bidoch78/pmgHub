#pragma once

#include <pmgHubUnits.h>

namespace pmgHub {

    class sensor {

        public:

            using sensorId = uint32_t;

            template<typename T>
            static constexpr sensorId toSensorId(T id) {
                return static_cast<sensorId>(id);
            };

            enum class sensorRate : uint32_t {
                LOW_RATE = 1000,
                MEDIUM_RATE = 300,
                HIGH_RATE = 100
            };

            enum class defaultSensorId : sensorId {
                ENGINE_AIRPRESSURE = 1,
                ENGINE_COOLANTTEMP = 2,
                ENGINE_WB_LEFT = 3,
                ENGINE_WB_RIGHT = 4,
                ENGINE_OIL_PRESSURE = 5,
                FUEL_PRESSURE = 6,
                FUEL_LEVEL = 7,
                TRANS_OIL_TEMP = 8,
                TRANS_SOL_A = 9,
                TRANS_SOL_B = 10,
                TRANS_SOL_LC = 11,
                TRANS_GEARSEL_NA = 12,
                TRANS_GEARSEL_1 = 13,
                TRANS_GEARSEL_2 = 14,
                TRANS_GEARSEL_D = 15,
                TRANS_GEARSEL_R = 16,
                ENV_DAYNIGHT = 17,
                FUEL_LEVEL_LOW = 18,
                TRANS_GEARSEL = 19,
                TRANS_SELECTOR = 20
            };

        private:

            uint32_t _dataLastRead = 0;
            uint32_t _dataCountRead = 0;

            sensorId _id;
            String _name;
            String _category;
            units::unitData _unit;
            
            uint32_t _rate;

            float _readVoltage;
            units::sensorValue _readValue;

        public:

            sensor(sensorId sId, String sName, String sCat, const units::unitData& sUnit, uint32_t sRate);
            ~sensor() = default;

//             sensorID getId() const;
//             sensorCategory getCategory() const;
//             sensorType getType() const;
//             sensorRate getRate() const;
//             String& getName() const;

//             bool isVirtual() const;
//             uint32_t getLastRead() const;
//             uint32_t getCountRead() const;
//             void resetCountRead(); 

//             void setValue(const float volt, const SensorValue& val);
//             void setValue(const float volt, const SensorValue& sv, uint32_t lread);

    };

};
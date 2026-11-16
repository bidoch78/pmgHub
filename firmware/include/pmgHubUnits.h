#pragma once

#include <Arduino.h>
#include <map>
#include <vector>
#include <variant>

namespace pmgHub {

    class units {

        public:

            using unitId = uint32_t;
            using typeId = uint32_t;

            enum class defaulUnitType: typeId {
                UNKNOWN = 0,
                PRESSURE = 1,
                TEMPERATURE = 2,
                FUELMIXTURE = 3,
                PERCENTAGE = 4,
                BOOL = 5,
                VIRTUAL = 6
            };

            enum class defaultUnitId: unitId {
                UNKNOWN = 0,
                ON = 1,
                BAR = 2,
                PSI = 3,
                CELSIUS = 4,
                FAHRENHEIT = 5,
                PCT = 6,
                LAMBDA = 7,
                AFR = 8,
                VIRTUAL = 9
            };

            using sensorValue = std::variant<std::monostate, bool, uint32_t, float, String>;

            struct unitData {
                unitId id;
                typeId type;
                const char* unitName;
                const char* typeName;
                uint8_t decimals;
                unitData(unitId uid, const char* uname, typeId utype, const char* tname, uint8_t udecimal): id(uid), unitName(uname), type(utype), typeName(tname), decimals(udecimal) {};
            };

        private:          

           std::map<unitId, unitData> _units; 
 
        public:

            units();
            ~units() = default;

            void addUnit(const unitData& unit);

            std::vector<unitData> getUnits(typeId utype) const;
            std::map<typeId, std::vector<unitData>> getAllUnits() const;

            const unitData* getUnit(unitId uid) const;
            const unitData* getUnit(typeId utype, unitId uid) const;
            
            sensorValue convertValue(const sensorValue& value, unitId fromUnit, unitId toUnit) const;
            sensorValue transformUnit(const sensorValue& value, unitId fromUnit, unitId toUnit) const;

    };

};
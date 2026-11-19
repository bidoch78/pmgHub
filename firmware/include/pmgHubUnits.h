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

            template<typename T>
            static constexpr unitId toUnitId(T id) {
                return static_cast<unitId>(id);
            };

            template<typename T>
            static constexpr typeId toTypeId(T id) {
                return static_cast<typeId>(id);
            };

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
                NO_UNIT = 0,
                UNKNOWN = 1,
                ON = 2,
                BAR = 3,
                PSI = 4,
                CELSIUS = 5,
                FAHRENHEIT = 6,
                PCT = 7,
                LAMBDA = 8,
                AFR = 9,
                VIRTUAL = 10
            };

            using sensorValue = std::variant<std::monostate, bool, int32_t, float, String>;

            struct unitData {
                unitId id;
                typeId type;
                const char* unitName;
                const char* typeName;
                uint8_t decimals;
                unitData(unitId uid, const char* uname, typeId utype, const char* tname, uint8_t udecimal): id(uid), unitName(uname), type(utype), typeName(tname), decimals(udecimal) {};
            };

        private:          

            unitData _noUnit;
            std::map<unitId, unitData> _units; 
 
        public:

            units();
            ~units() = default;

            void addUnit(const unitData& unit);

            std::vector<unitData> getUnits(typeId utype) const;
            std::map<typeId, std::vector<unitData>> getAllUnits() const;

            const unitData& getUnit(unitId uid) const;
            const unitData& getUnit(typeId utype, unitId uid) const;
            
            bool noUnit(const unitData& unit) const;

            sensorValue convertValue(const sensorValue& value, unitId fromUnit, unitId toUnit) const;
            sensorValue transformUnit(const sensorValue& value, unitId fromUnit, unitId toUnit) const;

    };

};
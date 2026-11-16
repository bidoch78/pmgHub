// #pragma once

// #include <pmgHubServices.h>
// #include <variant>

// namespace pmgHub {

//     class sensor {

//         public:

//             enum class sensorRate : uint32_t {
//                 LOW = 1000,
//                 MEDIUM = 300,
//                 HIGH = 100
//             };

//             enum class sensorID : uint32_t {
//                 ENGINE_AIRPRESSURE,
//                 ENGINE_COOLANTTEMP,
//                 ENGINE_WB_LEFT,
//                 ENGINE_WB_RIGHT,
//                 ENGINE_OIL_PRESSURE,
//                 FUEL_PRESSURE,
//                 FUEL_LEVEL,
//                 TRANS_OIL_TEMP,
//                 TRANS_SOL_A,
//                 TRANS_SOL_B,
//                 TRANS_SOL_LC,
//                 TRANS_GEARSEL_NA,
//                 TRANS_GEARSEL_1,
//                 TRANS_GEARSEL_2,
//                 TRANS_GEARSEL_D,
//                 TRANS_GEARSEL_R,
//                 ENV_DAYNIGHT,
//                 FUEL_LEVEL_LOW,
//                 TRANS_GEARSEL,
//                 TRANS_SELECTOR
//             };

//             enum class sensorCategory: uint32_t {
//                 ENGINE,
//                 FUEL,
//                 TRANSMISSION,
//                 ENV
//             };

//             enum class sensorType: uint32_t {
//                 PRESSURE,
//                 TEMPERATURE,
//                 FUELMIXTURE,
//                 PERCENTAGE,
//                 BOOL,
//                 VIRTUAL
//             };

//             enum class sensorUnitID: uint32_t {
//                 UNKNOWN
//                 ON,
//                 BAR,
//                 PSI,
//                 CELSIUS,
//                 FAHRENHEIT,
//                 PCT,
//                 LAMBDA,
//                 AFR, 
//             };

//             struct sensorUnit {
//                 sensorUnitID id;
//                 sessionType type;
//                 bool default;
//                 uint8_t decimals;
//                 sensorUnit(sensorUnitID sid, sessionType stype, uint8_t sdecimal, bool sdefault): 
//                     type(stype), id(sid), default(sdefault), decimals(sdecimal) {};
//             };

//             using SensorValue = std::variant<std::nullptr_t, bool, uint32_t, float, String>;

//         private:

//             services _service;

//             uint32_t _dataLastRead = 0;
//             uint32_t _dataCountRead = 0;

//             sensorID _id;
//             String _name;
//             sensorCategory _category;
//             sensorType _type;
//             sensorRate _rate;
//             sensorUnit _unit;

//             float _readVoltage;
//             SensorValue _readValue;

//         public:

//             sensor(sensorID sId, String sName, sensorCategory sCat, sensorType sType, sensorUnit sUnit);
//             ~device() = default;

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

//     };

// };
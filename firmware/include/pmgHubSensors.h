// #pragma once

// #include <pmgHubServices.h>
// #include <pmgHubSensor.h>

// namespace pmgHub {

//     class sensors {

//         public:

//             enum class rate : uint32_t {
//                 LOW = 1000,
//                 MEDIUM = 300,
//                 HIGH = 100
//             };

//         private:

//             services _service;

//             uint32_t _lastUpdate = 0;

//             std::map<sensor::sensorID, sensor> _sensors;
            
//         public:

//             sensors(services& svc);
//             ~sensors() = default;

//             sensor find(sensor::sensorID) const;
            
//             void update();

//             void retrieveSensors(std::map<sensor::sensorID, sensor> sensors) = 0;

//     };

// };
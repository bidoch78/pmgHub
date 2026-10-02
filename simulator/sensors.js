// class SensorSimulator {
//     constructor() {
//         this.scenario = "idle";
//         this.data = {
//             rpm: 850,
//             coolant: 86.0,
//             oilPressure: 1.8,
//             fuelPressure: 3.0,
//             ethanol: 78
//         };
//         this.sensors = [
//             { id: "engine.rpm", category: "ENGINE", name: "Engine speed", valueKey: "rpm", unit: "rpm", valueRange: [0, 8000] },
//             { id: "engine.coolant-temperature", category: "ENGINE", name: "Coolant temperature", valueKey: "coolant", unit: "°C", valueRange: [-20, 150] },
//             { id: "engine.oil-pressure", category: "ENGINE", name: "Oil pressure", valueKey: "oilPressure", unit: "bar", valueRange: [0, 10] },
//             { id: "fuel.pressure", category: "FUEL", name: "Fuel pressure", valueKey: "fuelPressure", unit: "bar", valueRange: [0, 6] },
//             { id: "fuel.ethanol-content", category: "FUEL", name: "Ethanol content", valueKey: "ethanol", unit: "%", valueRange: [0, 100] }
//         ];
//     }

//     setScenario(name) {
//         const allowed = [
//             "engineOff",
//             "idle",
//             "cruise",
//             "acceleration",
//             "lowOilPressure",
//             "overheat",
//             "sensorError"
//         ];

//         if (!allowed.includes(name)) {
//             return false;
//         }

//         this.scenario = name;
//         return true;
//     }

//     random(min, max) {
//         return min + Math.random() * (max - min);
//     }

//     update() {
//         switch (this.scenario) {
//             case "engineOff":
//                 this.data.rpm = 0;
//                 this.data.coolant = this.random(20, 25);
//                 this.data.oilPressure = 0;
//                 this.data.fuelPressure = 0;
//                 break;

//             case "idle":
//                 this.data.rpm = this.random(800, 900);
//                 this.data.coolant = this.random(84, 89);
//                 this.data.oilPressure = this.random(1.5, 2.0);
//                 this.data.fuelPressure = this.random(2.9, 3.1);
//                 break;

//             case "cruise":
//                 this.data.rpm = this.random(2400, 3200);
//                 this.data.coolant = this.random(86, 91);
//                 this.data.oilPressure = this.random(3.5, 4.5);
//                 this.data.fuelPressure = this.random(3.0, 3.3);
//                 break;

//             case "acceleration":
//                 this.data.rpm = this.random(3500, 6500);
//                 this.data.coolant = this.random(88, 94);
//                 this.data.oilPressure = this.random(4.0, 5.5);
//                 this.data.fuelPressure = this.random(3.3, 4.0);
//                 break;

//             case "lowOilPressure":
//                 this.data.rpm = this.random(3000, 5000);
//                 this.data.coolant = this.random(88, 92);
//                 this.data.oilPressure = this.random(0.5, 1.0);
//                 this.data.fuelPressure = this.random(3.0, 3.4);
//                 break;

//             case "overheat":
//                 this.data.rpm = this.random(1500, 3000);
//                 this.data.coolant = this.random(112, 120);
//                 this.data.oilPressure = this.random(2.5, 4.0);
//                 this.data.fuelPressure = this.random(3.0, 3.3);
//                 break;

//             case "sensorError":
//                 this.data.rpm = this.random(800, 900);
//                 this.data.coolant = this.random(84, 89);
//                 this.data.oilPressure = this.random(1.5, 2.0);
//                 this.data.fuelPressure = this.random(2.9, 3.1);
//                 break;
//         }

//         this.data.rpm = Math.round(this.data.rpm);
//         this.data.coolant = Number(this.data.coolant.toFixed(1));
//         this.data.oilPressure = Number(this.data.oilPressure.toFixed(1));
//         this.data.fuelPressure = Number(this.data.fuelPressure.toFixed(1));
//         this.data.ethanol = Number(this.data.ethanol.toFixed(1));

//         return this.getData();
//     }

//     toVoltage(value, [min, max]) {
//         const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
//         return Number((0.5 + ratio * 4).toFixed(3));
//     }

//     getData() {
//         return {
//             scenario: this.scenario,
//             sensors: this.sensors.map(sensor => {
//                 const value = Number(this.data[sensor.valueKey].toFixed(1));
//                 const error = this.scenario === "sensorError" && sensor.id === "fuel.pressure";
//                 const alarm =
//                     (sensor.id === "engine.oil-pressure" && value < 1.0) ||
//                     (sensor.id === "engine.coolant-temperature" && value >= 110);

//                 return {
//                     id: sensor.id,
//                     category: sensor.category,
//                     name: sensor.name,
//                     value,
//                     unit: sensor.unit,
//                     voltage: this.toVoltage(value, sensor.valueRange),
//                     error,
//                     alarm
//                 };
//             })
//         };
//     }
// }

// module.exports = SensorSimulator;

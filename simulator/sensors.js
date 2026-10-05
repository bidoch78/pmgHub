class SensorSimulator {

    constructor() {

        this.sensors = [
            { info: { id: "engine.airpressure", category: "ENGINE", name: "Air Pressure", type: "pressure" }, 'sim': { dtype: 'range', data: [ 0, 5] } },
            { info: { id: "engine.coolant-temp", category: "ENGINE", name: "Coolant Temperature", type: "temp" }, 'sim': { dtype: 'range', date: [ 0, 5 ] } },
            { info: { id: "engine.wb-left", category: "ENGINE", name: "WB Left", type: "lambda" }, 'sim': { dtype: 'range', data: [ 0, 5 ] } },
            { info: { id: "engine.wb-right", category: "ENGINE", name: "WB Right", type: "lambda" }, 'sim': { dtype: 'range', data: [ 0, 5 ] } },
            { info: { id: "engine.oil-pressure", category: "ENGINE", name: "Oil Pressure", type: "pressure" }, 'sim': { dtye: 'range', data: [ 0, 5 ] } },

            { info: { id: "fuel.pressure", category: "FUEL", name: "Fuel Pressure", type: "pressure" }, 'sim': { dtype: 'range', data: [ 0, 5 ] }},
            { info: { id: "fuel.level", category: "FUEL", name: "Fuel Level", type: "percentage" }, 'sim': { dtype: 'range', data: [ 0, 12 ] }},
            { info: { id: "fuel.level-low-warning", category: "FUEL", name: "Fuel Low Warning", type: "bool" }, 'sim': { dtype: 'pull', data: [ 0, 12] }},

            { info: { id: "trans.oil-temp", category: "TRANSMISSION", name: "Tranny Oil Temperature", type: "temp" }, sim: { dtype: "range", data: [ 0, 12 ] } },
            { info: { id: "trans.sol-a", category: "TRANSMISSION", name: "Tranny SolA", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.sol-b", category: "TRANSMISSION", name: "Tranny SolB", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.sol-lockconv", category: "TRANSMISSION", name: "Tranny SolLC", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.gearsel-na", category: "TRANSMISSION", name: "Tranny Selector NA", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.gearsel-1", category: "TRANSMISSION", name: "Tranny Selector 1", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.gearsel-2", category: "TRANSMISSION", name: "Tranny Selector 2", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.gearsel-d", category: "TRANSMISSION", name: "Tranny Selector D", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } },
            { info: { id: "trans.gearsel-r", category: "TRANSMISSION", name: "Tranny Selector R", type: "bool" }, sim: { dtype: "pull", data: [ 0, 12 ] } }

        ];

        for (const item of this.sensors) {
            item.unit = this.getUnit(item.info.type);
        }

    }

    getUnit(type) {

        const unit = { id: '', 'name': '', format: '%.2f' };

        switch(type) {
            case "bool": 
                unit.id = 'on'; 
                unit.name = "ON";
                unit.format = "%.0f";
                break;
            case "pressure": 
                unit.id = "psi"; 
                unit.name = "PSI"; 
                unit.format = "%.2f";
                break;
            case "temp":
                unit.id = "celcius"; 
                unit.name = "°C"; 
                unit.format = "%.0f"; 
                break;
            case "percentage":
                unit.id = "pct"; 
                unit.name = "%"; 
                unit.format = "%.0f"; 
                break;
            case "lambda":
                unit.id = "lambda" 
                unit.name = "λ"; unit.format = "%.2f"; break;
        }

        return unit;

    }

    getSensors() {

        const retSensors = [];
        for (const item of this.sensors) {
            retSensors.push({ sensor: item.info, unit: item.unit } );
        }
        return retSensors;

    }

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
}

module.exports = SensorSimulator;

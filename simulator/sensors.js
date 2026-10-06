class SensorSimulator {

    static rates = {
        LOW: 1000,
        MEDIUM: 500,
        HIGH: 100
    };

    constructor() {

        this.lastUpdate = null;

        this.sensors = [
            { info: { id: "engine.airpressure", category: "ENGINE", name: "Air Pressure", type: "pressure", rate: SensorSimulator.rates.HIGH }, sim: { dtype: 'range', data: [ 0, 5], out: [ -0.5, 2], unit: 'psi' }, unit: null, read: null, _data: null },
            { info: { id: "engine.coolant-temp", category: "ENGINE", name: "Coolant Temperature", type: "temp", rate: SensorSimulator.rates.LOW }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0, 120 ], unit: 'celcius' }, unit: null, read: null, _data: null },
            { info: { id: "engine.wb-left", category: "ENGINE", name: "WB Left", type: "lambda", rate: SensorSimulator.rates.HIGH }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0.68, 1.36 ], unit: 'lambda' }, unit: null, read: null, _data: null },
            { info: { id: "engine.wb-right", category: "ENGINE", name: "WB Right", type: "lambda", rate: SensorSimulator.rates.HIGH }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0.68, 1.36 ], unit: 'lambda' }, unit: null, read: null, _data: null },
            { info: { id: "engine.oil-pressure", category: "ENGINE", name: "Oil Pressure", type: "pressure", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0, 7 ], unit: 'psi' }, unit: null, read: null, _data: null },

            { info: { id: "fuel.pressure", category: "FUEL", name: "Fuel Pressure", type: "pressure", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0, 60 ], unit: 'psi' }, unit: null, read: null, _data: null },
            { info: { id: "fuel.level", category: "FUEL", name: "Fuel Level", type: "percentage", rate: SensorSimulator.rates.LOW }, sim: { dtype: 'range', data: [ 0, 12 ], out: [ 0, 100 ], unit: 'percentage' }, unit: null, read: null, _data: null },
            { info: { id: "fuel.level-low-warning", category: "FUEL", name: "Fuel Low Warning", rate: SensorSimulator.rates.LOW, type: "bool" }, sim: { dtype: 'pull', data: [ 0, 12], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },

            { info: { id: "trans.oil-temp", category: "TRANSMISSION", name: "T. Oil Temperature", type: "temp", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "range", data: [ 0, 12 ], out: [ 0, 120 ], unit: 'celcius' }, unit: null, read: null, _data: null },
            { info: { id: "trans.sol-a", category: "TRANSMISSION", name: "T. SolA", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.sol-b", category: "TRANSMISSION", name: "T. SolB", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.sol-lockconv", category: "TRANSMISSION", name: "T. SolLC", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-na", category: "TRANSMISSION", name: "T. Selector NA", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-1", category: "TRANSMISSION", name: "T. Selector 1", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-2", category: "TRANSMISSION", name: "T. Selector 2", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-d", category: "TRANSMISSION", name: "T. Selector D", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-r", category: "TRANSMISSION", name: "T. Selector R", type: "bool", rate: SensorSimulator.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null }

        ];

        for (const item of this.sensors) {
            item.unit = this.getUnit(item.info.type);
            item.read = { 'voltage': 0, 'value': 0, 'srate': 0 };
            item._data = { 'lastread': null, 'count': 0  }
        }

    }

    getUnit(type) {

        const unit = { id: '', 'name': '', decimals: 2 };

        switch(type) {
            case "bool": 
                unit.id = 'on'; 
                unit.name = "ON";
                unit.decimals = 0;
                break;
            case "pressure": 
                unit.id = "psi"; 
                unit.name = "PSI"; 
                unit.decimals = 2;
                break;
            case "temp":
                unit.id = "celcius"; 
                unit.name = "°C"; 
                unit.decimals = 0;
                break;
            case "percentage":
                unit.id = "pct"; 
                unit.name = "%"; 
                unit.decimals = 0;
                break;
            case "lambda":
                unit.id = "lambda" 
                unit.name = "λ"; 
                unit.decimals = 2;
                break;
        }

        return unit;

    }

    getSensors(ids = null) {

        const retSensors = [];
        for (const item of this.sensors) {
            retSensors.push({ sensor: item.info, unit: item.unit } );
        }
        return retSensors;

    }

    randomToggle(min, max) { return Math.random() < 0.5 ? min : max; }
    random(min, max) { return min + Math.random() * (max - min); }

    convertLinar(value, min, max, outMin, outMax) {
        
        const ratio = (value - min) / (max - min);
        const result = outMin + ratio * (outMax - outMin);
        
        //never before min and after max
        return Math.min(Math.max(result, Math.min(outMin, outMax)), Math.max(outMin, outMax));

    }

    transformUnit(value, unit, toObjectUnit) {
        
        switch(unit) {
            //Pressure
            case "psi":
                switch(toObjectUnit) {
                    case "bar":
                        value = value * 0.0689476;
                        break;
                }
                break;
            //Temp
            case "celcius":
                 switch(toObjectUnit) {
                    case "fahrenheit":
                        value = (value * 9 / 5) + 32
                        break;
                }
                break;
            //WB
            case "lambda":
                switch(toObjectUnit) {
                    case "afr":
                        value = value * 14.7;
                        break;
                }
                break;
        }

        return value;
        
    }

    roundValue(value, decimals = 2) {
        return Math.round(value * 10 ** decimals) / 10 ** decimals;
    }

    update() {

        const now = Date.now();    

        if (!this.lastUpdate) this.lastUpdate = now;

        for (const item of this.sensors) {

            //Check aquisition freq
            if (item._data.lastread) {
                if ((now - item._data.lastread) < item.info.rate) continue;
            }
           
            item._data.lastread = now;
            item._data.count++;

            if ((now - this.lastUpdate) >= 1000) {
                item.read.srate = item._data.count;
                item._data.count = 0;
            }

            //Read

            item.read.voltage = null;
            item.read.value = null;

            switch(item.sim.dtype) {
                case "range":
                    item.read.voltage = this.roundValue(this.random(item.sim.data[0], item.sim.data[1]));
                    break;
                case "pull":
                    item.read.voltage = this.roundValue(this.randomToggle(item.sim.data[0], item.sim.data[1]));
                    break;
            }

            let value = 0;

            switch(item.info.type) {
                
                case "bool": 
                    value = (item.read.voltage == item.sim.data[0]) ? item.sim.out[0] : item.sim.out[1];
                    break;
                //linear conversion
                case "pressure": 
                case "temp":
                case "percentage":
                case "lambda":
                    value = this.convertLinar(item.read.voltage, item.sim.data[0], item.sim.data[1], item.sim.out[0], item.sim.out[1]);
                    break;

            }

            if (value !== null) {

                item.read.value = this.roundValue(this.transformUnit(value, item.sim.unit, item.unit), item.unit.decimals);

            }

        }

        if ((now - this.lastUpdate) >= 1000) this.lastUpdate = now;

    }

    getValues() {

        const valueSensors = new Map();

        for (const item of this.sensors) valueSensors.set(item.info.id, item.read);

        return valueSensors;

    }

}

module.exports = SensorSimulator;

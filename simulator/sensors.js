class Sensors {

    static rates = {
        LOW: 1000,
        MEDIUM: 300,
        HIGH: 100
    };

    constructor(services) {

        this._services = services;
        this._lastUpdate = null;

        this._sensors = [
            { info: { id: "engine.airpressure", category: "ENGINE", name: "Air Pressure", type: "pressure", rate: Sensors.rates.HIGH }, sim: { dtype: 'range', data: [ 0, 5], out: [ -0.5, 2], unit: 'psi' }, unit: null, read: null, _data: null },
            { info: { id: "engine.coolant-temp", category: "ENGINE", name: "Coolant Temperature", type: "temperature", rate: Sensors.rates.LOW }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0, 120 ], unit: 'celcius' }, unit: null, read: null, _data: null },
            { info: { id: "engine.wb-left", category: "ENGINE", name: "WB Left", type: "lambda", rate: Sensors.rates.HIGH }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0.68, 1.36 ], unit: 'lambda' }, unit: null, read: null, _data: null },
            { info: { id: "engine.wb-right", category: "ENGINE", name: "WB Right", type: "lambda", rate: Sensors.rates.HIGH }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0.68, 1.36 ], unit: 'lambda' }, unit: null, read: null, _data: null },
            { info: { id: "engine.oil-pressure", category: "ENGINE", name: "Oil Pressure", type: "pressure", rate: Sensors.rates.MEDIUM }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0, 7 ], unit: 'psi' }, unit: null, read: null, _data: null },

            { info: { id: "fuel.pressure", category: "FUEL", name: "Fuel Pressure", type: "pressure", rate: Sensors.rates.MEDIUM }, sim: { dtype: 'range', data: [ 0, 5 ], out: [ 0, 60 ], unit: 'psi' }, unit: null, read: null, _data: null },
            { info: { id: "fuel.level", category: "FUEL", name: "Fuel Level", type: "percentage", rate: Sensors.rates.LOW }, sim: { dtype: 'range', data: [ 0, 12 ], out: [ 0, 100 ], unit: 'percentage' }, unit: null, read: null, _data: null },
            //{ info: { id: "fuel.level-low-warning", category: "FUEL", name: "Fuel Low Warning", rate: Sensors.rates.LOW, type: "bool" }, sim: { dtype: 'pull', data: [ 0, 12], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },

            { info: { id: "trans.oil-temp", category: "TRANSMISSION", name: "T. Oil Temperature", type: "temperature", rate: Sensors.rates.MEDIUM }, sim: { dtype: "range", data: [ 0, 12 ], out: [ 0, 120 ], unit: 'celcius' }, unit: null, read: null, _data: null },
            { info: { id: "trans.sol-a", category: "TRANSMISSION", name: "T. SolA", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.sol-b", category: "TRANSMISSION", name: "T. SolB", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.sol-lockconv", category: "TRANSMISSION", name: "T. SolLC", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-na", category: "TRANSMISSION", name: "T. Selector NA", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-1", category: "TRANSMISSION", name: "T. Selector 1", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-2", category: "TRANSMISSION", name: "T. Selector 2", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-d", category: "TRANSMISSION", name: "T. Selector D", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },
            { info: { id: "trans.gearsel-r", category: "TRANSMISSION", name: "T. Selector R", type: "bool", rate: Sensors.rates.MEDIUM }, sim: { dtype: "pull", data: [ 0, 12 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },

            { info: { id: "env.daynight", category: "ENV", name: "Day/Night", type: "bool", rate: Sensors.rates.LOW }, sim: { dtype: "pull", data: [ 0, 5 ], out: [ 0, 1 ], unit: 'bool' }, unit: null, read: null, _data: null },

            // Virtual sensors
            { info: { id: "trans.gearsel", category: "TRANSMISSION", name: "T. Gear", type: "virtual", rate: Sensors.rates.MEDIUM }, sim: { dtype: "virtual", data: null, out: [], unit: 'default' }, unit: null, read: null, _data: null },
            { info: { id: "trans.selector", category: "TRANSMISSION", name: "T. Selector", type: "virtual", rate: Sensors.rates.MEDIUM }, sim: { dtype: "virtual", data: null, out: [], unit: 'default' }, unit: null, read: null, _data: null },
            { info: { id: "fuel.level-low-warning", category: "FUEL", name: "Fuel Low Warning", type: "virtual", rate: Sensors.rates.LOW }, sim: { dtype: "virtual", data: null, out: [], unit: 'bool' }, unit: null, read: null, _data: null }

        ];

        this._sensorById = new Map();

        for (const item of this._sensors) {
            this._sensorById.set(item.info.id, item);
            item.unit = this.getUnits(item.info.type)[0];
            item.unit['default'] = true;
            item.read = { 'voltage': 0, 'value': 0, 'srate': 0 };
            item._data = { 'lastread': null, 'count': 0  }
        }

    }

    /**
     * 
     * @param {*} type 
     * @returns 
     *  
     *  First item is unit used by the hub (initial value)
     * 
     */
    getUnits(type) {

        let units = null;

        switch(type) {
            case "bool":
                units = [{ type: type, id: 'on', 'name': 'SW', decimals: 0 }];
                break;
            case "pressure": 
                units = [{ type: type, id: 'bar', 'name': 'Bar', decimals: 2 }, { type: type, id: 'psi', 'name': 'PSI', decimals: 2 }];
                break;
            case "temperature":
                units = [{ type: type, id: 'celsius', 'name': '°C', decimals: 0 }, { type: type, id: 'fahrenheit', 'name': '°F', decimals: 0 }];                
                break;
            case "percentage":
                units = [{ type: type, id: 'pct', 'name': '%', decimals: 0 }];
                break;
            case "lambda":
                units = [{ type: type, id: 'lambda', 'name': 'λ', decimals: 2 }, { type: type, id: 'afr', 'name': 'AFR', decimals: 2 }];
                break;
            default:
                units = [{ type: type, id: '-', 'name': '', decimals: 0 }];
                
        }

        return units;

    }

    getUnit(type, uId) {

        const units = this.getUnits(type);
        if (!units) return null;

        for(const unit of units) {
            if (unit.id == uId) return unit;
        }

        return false;

    }

    convertValue(value, fromUnit, toUnit) {

        if (!fromUnit || !toUnit || fromUnit.id == toUnit.id || fromUnit.type != toUnit.type) return value;
        
        if (fromUnit.type == "temperature") {

            if (fromUnit.id == "celsius") return (value * 9 / 5) + 32;
            if (fromUnit.id == "fahrenheit") return (value - 32) * 5 / 9;

        }

        return value;

    }

    get(ids = null, withAllUnits = false) {

        const retSensors = [];
        for (const item of this._sensors) {
            if (!ids || ids.includes(item.info.id)) retSensors.push({ sensor: item.info, unit: (!withAllUnits) ? item.unit : this.getUnits(item.info.type) } );
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

    getReadDataOf(ids) {

        const sensorsVoltage = new Map();

        if (!Array.isArray(ids)) return sensorsVoltage;

        for (const item of this._sensors) {

            if (ids.includes(item.info.id)) {
                sensorsVoltage.set(item.info.id, item.read);
            }

        }

        return sensorsVoltage;

    }

    update() {

        const now = Date.now();

        if (!this._lastUpdate) this._lastUpdate = now;

        const elapsed = now - this._lastUpdate;
        const updateSrate = elapsed >= 1000;

        const virtuals = [];
        for (const item of this._sensors) {

            // Calcul du srate et reset
            if (updateSrate) {
                item.read.srate = Math.round(item._data.count * 1000 / elapsed);
                item._data.count = 0;
            }

            // Fréquence d'acquisition
            if (item._data.lastread && (now - item._data.lastread) < item.info.rate) continue;

            item._data.lastread = now;
            item._data.count++;

            ///////////////////////////////////////////////////////
            //Read sensors
            ///////////////////////////////////////////////////////

            if (item.info.type == "virtual") { 
                virtuals.push(item);
                continue;
            }

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
                case "temperature":
                case "percentage":
                case "lambda":
                    value = this.convertLinar(item.read.voltage, item.sim.data[0], item.sim.data[1], item.sim.out[0], item.sim.out[1]);
                    break;

            }

            if (value !== null) {

                item.read.value = this.roundValue(this.transformUnit(value, item.sim.unit, item.unit), item.unit.decimals);

            }

        }

        // Virtual sensors
        let sensorsData = null;
        for (const item of virtuals) {

            let sensorsToRead = null;

            switch(item.info.id) {

                case "trans.gearsel":

                    /* if trans.gearsel-na != 0

                            if trans.sol-a = 1 && trans.sol-b = 1
                                value = 1
                            else if trans.sol-a = 0 && trans.sol-b = 1
                                value = 2
                            else if trans.sol-a = 0 && trans.sol-b = 0
                                value = 3
                            else if trans.sol-a = 1 && trans.sol-b = 0

                                if (trans.sol-lockconv = 1) 
                                    value = 5
                                else 
                                    value = 4

                    else
                            value = "-"
                    */
                    
                    sensorsToRead = [ 'trans.gearsel-na', 'trans.sol-a', 'trans.sol-b', 'trans.sol-lockconv', 'trans.gearsel-r' ];
                    sensorsData = this.getReadDataOf(sensorsToRead);

                    const na = sensorsData.has('trans.gearsel-na') && sensorsData.get('trans.gearsel-na').value === 1;

                    // default
                    item.read.value = "-";

                    if (na) {
                        item.read.value = 0;
                    }
                    else {

                        const rev = sensorsData.has('trans.gearsel-r') && sensorsData.get('trans.gearsel-r').value;
                        if (rev) {
                            item.read.value = 1;
                            return;
                        }
                        
                        const sola = sensorsData.has('trans.sol-a') && sensorsData.get('trans.sol-a').value;
                        const solb = sensorsData.has('trans.sol-b') && sensorsData.get('trans.sol-b').value;

                        if (sola && solb) {
                            item.read.value = 1;
                        }
                        else if (sola === 0 && solb) {
                            item.read.value = 2;
                        }
                        else if (sola === 0 && solb === 0) {
                            item.read.value = 3;
                        }
                        else if (sola && solb === 0) {
                            
                            const sollc = sensorsData.has('trans.sol-lockconv') && sensorsData.get('trans.sol-lockconv').value == 1;
                            item.read.value = sollc ? 5 : 4;
                        
                        }

                    }
                    break;

                case "trans.selector":

                    /*  trans.gearsel-na & trans.gearsel-1 & trans.gearsel-2 & trans.gearsel-d & trans.gearsel-r */

                    sensorsToRead = [ 'trans.gearsel-na', 'trans.gearsel-d', 'trans.gearsel-r', 'trans.gearsel-1', 'trans.gearsel-2' ];
                    sensorsData = this.getReadDataOf(sensorsToRead);

                    // default
                    item.read.value = "-";

                    for(const sel of sensorsToRead) {
                        if (sensorsData.has(sel) && sensorsData.get(sel).value) {
                            switch(sel) {
                                case "trans.gearsel-na": item.read.value = "NA"; break;
                                case "trans.gearsel-d": item.read.value = "D"; break;
                                case "trans.gearsel-r": item.read.value = "R"; break;
                                case "trans.gearsel-1": item.read.value = "1"; break;
                                case "trans.gearsel-2": item.read.value = "2"; break;
                            }
                            break;
                        }
                    }
                    break;

                case "fuel.level-low-warning":

                    sensorsToRead = [ 'fuel.level' ];
                    sensorsData = this.getReadDataOf(sensorsToRead);                    

                    const flevel = sensorsData.has('fuel.level') && sensorsData.get('fuel.level').value;
                    item.read.value = (flevel <= 10) ? 1 : 0;

                    break;

            }

        }

        if (updateSrate) this._lastUpdate = now;

    }

    convertSensor(id, value, toUnit, applyformat = true) {

        const sensorInfo = this._sensorById.get(id);
        if (!sensorInfo) return value;

        const sensorType = sensorInfo.info.type;

        const toUnitObj = this.getUnit(sensorType, toUnit);
        const convValue = this.convertValue(value, sensorInfo.unit, toUnitObj);

        return (!applyformat) ? value : this.roundValue(convValue, toUnitObj ? toUnitObj.decimals : 2);

    }

    getValues() {

        const valueSensors = new Map();

        for (const item of this._sensors) valueSensors.set(item.info.id, item.read);

        return valueSensors;

    }

}

module.exports = Sensors;

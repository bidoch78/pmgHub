class SensorSimulator {
    constructor() {
        this.scenario = "idle";

        this.data = {
            rpm: 850,
            coolant: 86.0,
            oilPressure: 1.8,
            fuelPressure: 3.0,
            ethanol: 78
        };
    }

    setScenario(name) {
        const allowed = [
            "engineOff",
            "idle",
            "cruise",
            "acceleration",
            "lowOilPressure",
            "overheat"
        ];

        if (!allowed.includes(name)) {
            return false;
        }

        this.scenario = name;
        return true;
    }

    random(min, max) {
        return min + Math.random() * (max - min);
    }

    update() {
        switch (this.scenario) {
            case "engineOff":
                this.data.rpm = 0;
                this.data.coolant = this.random(20, 25);
                this.data.oilPressure = 0;
                this.data.fuelPressure = 0;
                break;

            case "idle":
                this.data.rpm = this.random(800, 900);
                this.data.coolant = this.random(84, 89);
                this.data.oilPressure = this.random(1.5, 2.0);
                this.data.fuelPressure = this.random(2.9, 3.1);
                break;

            case "cruise":
                this.data.rpm = this.random(2400, 3200);
                this.data.coolant = this.random(86, 91);
                this.data.oilPressure = this.random(3.5, 4.5);
                this.data.fuelPressure = this.random(3.0, 3.3);
                break;

            case "acceleration":
                this.data.rpm = this.random(3500, 6500);
                this.data.coolant = this.random(88, 94);
                this.data.oilPressure = this.random(4.0, 5.5);
                this.data.fuelPressure = this.random(3.3, 4.0);
                break;

            case "lowOilPressure":
                this.data.rpm = this.random(3000, 5000);
                this.data.coolant = this.random(88, 92);
                this.data.oilPressure = this.random(0.5, 1.0);
                this.data.fuelPressure = this.random(3.0, 3.4);
                break;

            case "overheat":
                this.data.rpm = this.random(1500, 3000);
                this.data.coolant = this.random(112, 120);
                this.data.oilPressure = this.random(2.5, 4.0);
                this.data.fuelPressure = this.random(3.0, 3.3);
                break;
        }

        this.data.rpm = Math.round(this.data.rpm);
        this.data.coolant = Number(this.data.coolant.toFixed(1));
        this.data.oilPressure = Number(this.data.oilPressure.toFixed(1));
        this.data.fuelPressure = Number(this.data.fuelPressure.toFixed(1));

        return this.getData();
    }

    getData() {
        return {
            ...this.data,
            scenario: this.scenario
        };
    }
}

module.exports = SensorSimulator;

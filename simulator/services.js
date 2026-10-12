
const config = require("./config");

const SessionManager = require("./sessions");
const Sensors = require("./sensors");
const Devices = require("./devices");
const PairingDeviceManager = require("./pairing");

class Services {

    constructor() {

        this.sessions = new SessionManager(config.auth.sessionTimeoutMs);
        this.sensors = new Sensors();
        this.devices = new Devices();
        this.pairing = new PairingDeviceManager(Number(process.env.PAIRING_WINDOW_MS || 60000))     

    }

    getSessions() { return this.sessions; }
    getSensors() { return this.sensors; }
    getDevices() { return this.devices; }
    getPairing() { return this.pairing; }

}

module.exports = Services;
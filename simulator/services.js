
const config = require("./config");

const SessionManager = require("./sessions");
const Sensors = require("./sensors");
const Devices = require("./devices");
const PairingDeviceManager = require("./pairing");
const WSClientSessionManager = require("./ws_clientsessionmanager")

class Services {

    constructor() {

        this.sessions = new SessionManager(config.auth.sessionTimeoutMs);
        this.sensors = new Sensors();
        this.devices = new Devices();
        this.pairing = new PairingDeviceManager(Number(process.env.PAIRING_WINDOW_MS || 60000));
        this.csManager = new WSClientSessionManager();

    }

    getSessions() { return this.sessions; }
    getSensors() { return this.sensors; }
    getDevices() { return this.devices; }
    getPairing() { return this.pairing; }
    getCSManager() { return this.csManager; }

    removeAllPairingDevices() {

        const pairingDeviceUID = this.pairing.getPairingDevicesUID();
        for(const uID of pairingDeviceUID) this.csManager.remove(uID);

    }

}

module.exports = Services;
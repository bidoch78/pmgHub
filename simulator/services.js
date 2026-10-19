
const config = require("./config");

const SessionManager = require("./sessions");
const Sensors = require("./sensors");
const Devices = require("./devices");
const PairingDeviceManager = require("./pairing");
const WSClientSessionManager = require("./ws_clientsessionmanager")

class Services {

    constructor() {

        this.sessions = new SessionManager(this, this,config.auth.sessionTimeoutMs);
        this.sensors = new Sensors(this);
        this.devices = new Devices(this);
        this.pairing = new PairingDeviceManager(this, Number(process.env.PAIRING_WINDOW_MS || 60000));
        this.csManager = new WSClientSessionManager(this);

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

    deviceCloseConnection(uID) {

        //Remove all dependencies of this device
        //And device itself if not a persistent device
        console.log(`---- Clean all depencies of ${uID} device`)


    }

}

module.exports = Services;
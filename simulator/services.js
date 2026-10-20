
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
        console.log(`---- Clean all depencies of ${uID} device`);

        const currDevice = this.devices.getDeviceByuID(uID);

        //This case can arrive if 2 admin console is opened at the same time.
        if (!currDevice) return;

        //if pairing mode
        this.pairing.removePairindDevice(currDevice);
        
        //delete device
        if (!currDevice.persistent) {
            this.devices.unregister(currDevice.token);
        }

        //Broadcast to WebAdmin device list + pairing list
        this.csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": this.pairing.getPairingDevices(true) }));
        this.csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": this.devices.getDevices(true) }));

    }

}

module.exports = Services;
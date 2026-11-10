
const config = require("./config");

const SessionManager = require("./sessions");
const Sensors = require("./sensors");
const Devices = require("./devices");
const PairingDeviceManager = require("./pairing");
const WSClientSessionManager = require("./ws_clientsessionmanager")

class Services {

    constructor() {

        this._sessions = new SessionManager(this, config.auth.sessionTimeoutMs);
        this._sensors = new Sensors(this);
        this._devices = new Devices(this);
        this._pairing = new PairingDeviceManager(this, Number(process.env.PAIRING_WINDOW_MS || 60000));
        this._csManager = new WSClientSessionManager(this);

    }

    getSessions() { return this._sessions; }
    getSensors() { return this._sensors; }
    getDevices() { return this._devices; }
    getPairing() { return this._pairing; }
    getCSManager() { return this._csManager; }

    removeAllPairingDevices() {

        //Remove all pairing devices
        console.log("Remove all pairing devices");

        const pairingDeviceUID = this._pairing.getPairingDevicesUID();
        for(const uID of pairingDeviceUID) if (!this._csManager.remove(uID)) this.deviceCloseConnection(uID);

    }

    deviceCloseConnection(uID) {

        //Remove all dependencies of this device
        //And device itself if not a persistent device
        console.log(`---- Clean all depencies of ${uID} device`);

        const currDevice = this._devices.getDeviceByuID(uID);

        //This case can arrive if 2 admin console is opened at the same time.
        if (!currDevice) return;

        this._devices.disconnectDevice(currDevice);

        //if pairing mode
        this._pairing.removePairindDevice(currDevice);
        
        //delete device
        if (!currDevice.persistent) this._devices.unregister(currDevice);

        //Broadcast to WebAdmin device list + pairing list
        this._csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": this._pairing.getPairingDevices(true) }));
        this._csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": this._devices.getDevices(true) }));

    }

}

module.exports = Services;
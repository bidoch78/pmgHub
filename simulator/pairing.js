const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

class PairingDeviceManager {

    constructor(services, pairingWindowMs) {

        this._services = services;
        this._pairingWindowMs = pairingWindowMs;
        this._pairingWindowExpireAt = null;
        this._pairingWindowRemainingSent = null;
        this._pairingDevices = new Map();
        this._pairingCleanLastExec = null;

    }

    openWindow() {
        this._pairingWindowExpireAt = Date.now() + this._pairingWindowMs;
        this._pairingWindowRemainingSent = null;
    }

    closeWindow() {
        this._pairingWindowExpireAt = null;
        this._pairingWindowRemainingSent = null;
    }

    windowIsOpened() {
        return Date.now() < this._pairingWindowExpireAt;
    }

    getNextRemainingTimeMs() {
        
        if (!this.windowIsOpened()) return null;

        const remainingTime = Math.max(0, Math.floor((this._pairingWindowExpireAt - Date.now()) / 1000));
        if (this._pairingWindowRemainingSent === null || this._pairingWindowRemainingSent != remainingTime) {
            
            this._pairingWindowRemainingSent = remainingTime;
            const rTime = this._pairingWindowRemainingSent * 1000;

            if (rTime <= 0) {
                this._pairingWindowExpireAt = null;
                this._pairingWindowRemainingSent = null;
            }

            return rTime;
        }

        return null;

    }

    checkDevicePairingConnect(devicePairingData) {

        if (!this.windowIsOpened()) {
            console.log("PAIRING - Pairing Window is closed - Reject")
            return "PAIRING_WINDOW_CLOSED";
        }
          
        if (!devicePairingData || !devicePairingData.pairingCode) {
            console.log("PAIRING - No pairing code - Reject")
            return "NO_PAIRING_CODE";
        }

        if (typeof devicePairingData.mac !== "string" || !macPattern.test(devicePairingData.mac)) {
            console.log("PAIRING - Wrong MAC address - Reject")
            return "MAC_ERROR";
        }
            
        return true;

    }

    addPairingDevice(device, devicePairingData) {

        const pairingDeviceData = {
            uID: device.uID,
            attempts: 0,
            pairingData: devicePairingData
        }

        device.pairing = true;
        console.log("pairing add new:" + device.uID);
        this._pairingDevices.set(device.uID, pairingDeviceData);

    }

    removePairindDevice(device) {

        device.pairing = false;
        console.log("pairing remove:" + device.uID);
        this._pairingDevices.delete(device.uID);

        console.log("pairing count:" + this._pairingDevices.size);

    }

    checkPairingCode(uID, code) {

        const ret = { 'validate': false, 'remainingAttempts': 0 };

        if (this._pairingDevices.has(uID)) {

            const pairingDevice = this._pairingDevices.get(uID)
            
            ret.validate = pairingDevice.pairingData.pairingCode == code;

            console.log(code + " " + pairingDevice.pairingData.pairingCode);

            if (!ret.validate) pairingDevice.attempts++;
            ret.remainingAttempts = 3 - pairingDevice.attempts;

        }

        return ret;

    }

    //Need to do it every 10 seconds
    cleanPairingDevices() {

        const dtNow = Date.now();
        if (this._pairingCleanLastExec && (dtNow - this._pairingCleanLastExec) < 10000) return null;
        this._pairingCleanLastExec = dtNow;

        console.log("Clean pairing devices");

        if (!this._pairingDevices.size || this.windowIsOpened()) return null;

        const deviceUIDs = [...this._pairingDevices.keys()];
        
        for (const [key, data] of this._pairingDevices) {
            this._pairingDevices.delete(key);
        }

        return deviceUIDs;

    }

    pairingDeviceCount() { return this._pairingDevices.size; }
    
    getPairingDevicesUID() { return [...this._pairingDevices.keys()]; }

    getPairingDevices(forMessage = false) { 
        
        if (!forMessage) return [...this._pairingDevices.values()];

        const devData = [];

        for (const [uID, data] of this._pairingDevices) {

            devData.push({
                uID: uID,
                mac: data.pairingData.mac
            });

        }

        return devData;
        
    }

}

module.exports = PairingDeviceManager;
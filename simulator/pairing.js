const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

class PairingDeviceManager {

    constructor(services, pairingWindowMs) {

        this.services = services;
        this.pairingWindowMs = pairingWindowMs;
        this.pairingWindowExpireAt = null;
        this.pairingWindowRemainingSent = null;
        this.pairingDevices = new Map();
        //this.pairingCleanLastExec = null;

    }

    openWindow() {
        this.pairingWindowExpireAt = Date.now() + this.pairingWindowMs;
        this.pairingWindowRemainingSent = null;
    }

    closeWindow() {
        this.pairingWindowExpireAt = null;
        this.pairingWindowRemainingSent = null;
    }

    windowIsOpened() {
        return Date.now() < this.pairingWindowExpireAt;
    }

    getNextRemainingTimeMs() {
        
        if (!this.windowIsOpened()) return null;

        const remainingTime = Math.max(0, Math.floor((this.pairingWindowExpireAt - Date.now()) / 1000));
        if (this.pairingWindowRemainingSent === null || this.pairingWindowRemainingSent != remainingTime) {
            
            this.pairingWindowRemainingSent = remainingTime;
            const rTime = this.pairingWindowRemainingSent * 1000;

            if (rTime <= 0) {
                this.pairingWindowExpireAt = null;
                this.pairingWindowRemainingSent = null;
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
            resync: devicePairingData.token != "",
            pairingData: devicePairingData
        }

        device.pairing = true;
        console.log("pairing add new:" + device.uID);
        this.pairingDevices.set(device.uID, pairingDeviceData);

    }

    removePairindDevice(device) {

        device.pairing = false;
        console.log("pairing remove:" + device.uID);
        this.pairingDevices.delete(device.uID);

        console.log("pairing count:" + this.pairingDevices.size);

    }

    checkPairingCode(uID, code) {

        const ret = { 'validate': false, 'remainingAttempts': 0 };

        if (this.pairingDevices.has(uID)) {

            const pairingDevice = this.pairingDevices.get(uID)
            
            ret.validate = pairingDevice.pairingData.pairingCode == code;

            console.log(code + " " + pairingDevice.pairingData.pairingCode);

            if (!ret.validate) pairingDevice.attempts++;
            ret.remainingAttempts = 3 - pairingDevice.attempts;

        }

        return ret;

    }

    //Need to do it every second
    // cleanPairingDevices(devices, now = false) {

    //     if (!this.pairingDevices.size) return false;

    //     const dtNow = Date.now();

    //     if (!now) {

    //         if (this.pairingCleanLastExec && ((dtNow - this.pairingCleanLastExec) < 1000)) {
    //             return false;
    //         }

    //     }

    //     this.pairingCleanLastExec = dtNow;
    //     const deviceList = devices.getDevicesByuIDs([...this.pairingDevices.keys()]);
        
    //     let pairingListUpdated = false;
    //     for (const device of deviceList) {
    //         if (!device.connected && device.pairing) {
    //             console.log("remove pairing");
    //             this.pairingDevices.delete(device.uID);
    //             devices.unregister(device.token);
    //             pairingListUpdated = true;
    //         }
    //     }

    //     return pairingListUpdated;

    // }

    pairingDeviceCount() { return this.pairingDevices.size; }
    
    getPairingDevicesUID() { return [...this.pairingDevices.keys()]; }

    getPairingDeviceByUID(uID) { return this.pairingDevices.has(uID) ? this.pairingDevices.get(uID) : null; }

    getPairingDevices(forMessage = false) { 
        
        if (!forMessage) return [...this.pairingDevices.values()];

        const devData = [];

        for (const [uID, data] of this.pairingDevices) {

            devData.push({
                uID: uID,
                mac: data.pairingData.mac
            });

        }

        return devData;
        
    }

}

module.exports = PairingDeviceManager;
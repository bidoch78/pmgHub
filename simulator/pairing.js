const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

class PairingDeviceManager {

    constructor(pairingWindowMs) {

        this.pairingWindowMs = pairingWindowMs;
        this.pairingWindowExpireAt = null;
        this.pairingWindowRemainingSent = null;
        this.pairingDevices = new Map();
        
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
            
            const rTime = remainingTime * 1000;
            this.pairingWindowRemainingSent = rTime;

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

        this.pairingDevices.set(device.uID, pairingDeviceData);
    }

    paringDeviceCount() { return this.pairingDevices.size; }
    
    getPairingDeviceByUID(uID) { return this.pairingDevices.has(uID) ? null : null; }

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
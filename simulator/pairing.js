class PairingDeviceManager {

    constructor(pairingWindowMs) {

        this.pairingWindowMs = pairingWindowMs;
        this.pairingWindowMs = 10000;
        this.pairingWindowExpireAt = null;
        this.pairingWindowRemainingSent = null;
        
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

}

module.exports = PairingDeviceManager;
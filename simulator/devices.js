class DeviceSimulator {
    constructor() {
        this.devices = [
            {
                mac: "02:00:00:00:00:01",
                name: "Dashboard display",
                connected: true
            },
            {
                mac: "02:00:00:00:00:02",
                name: "",
                connected: false
            }
        ];
    }

    getAll() {
        return this.devices.map(device => ({ ...device }));
    }

    setName(mac, name) {
        const device = this.devices.find(
            item => item.mac.toLowerCase() === mac.toLowerCase()
        );

        if (!device) {
            return null;
        }

        if (typeof name !== "string" || name.length > 32) {
            return false;
        }

        device.name = name.trim();
        return { ...device };
    }

    reject(mac) {
        const index = this.devices.findIndex(
            item => item.mac.toLowerCase() === mac.toLowerCase()
        );

        if (index === -1) {
            return null;
        }

        return this.devices.splice(index, 1)[0];
    }
}

module.exports = DeviceSimulator;
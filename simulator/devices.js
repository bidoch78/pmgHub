const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { isAuthenticated } = require("./auth");
const { domainToASCII } = require("url");

const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

class Devices {

    constructor(services, storePath = process.env.PMGHUB_DEVICE_STORE_PATH || path.resolve(__dirname, "../data/paired-devices.json")) {

        this.services = services;
        this.devices = new Map();
        this.storePath = storePath;
        this.load();

    }

    static generateMacAddress() {
        return Array.from({ length: 6 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':');
    }

    createDeviceObject(token, services) {

        return {
            uID: crypto.randomUUID(),
            token: token,
            isWebAdmin: false,
            listenSensors: false,
            connected: true,
            pairing: false,
            persistent: false,
            services: services,
            name: null,
            mac: Devices.generateMacAddress(),
            sensors: null,
            nonce: null,
            startListenSensors() {
                const sensors = this.sensorsUsed();
                const sensorsData = new Map();
                for (const item of sensors) sensorsData.set(item.sensor.id, { 'lastValue': null } );
                this.sensors = sensorsData;
                this.listenSensors = true;
            },
            stopListenSensors() {
                this.sensors = null;
                this.listenSensors = false;
            },
            sensorsUsed() {
                return this.services.getSensors().get();
            }
        };

    }

    authenticatedObject(device, withToken) {

        const authDevice = {
            'mac': device.mac,
            'nonce': device.nonce
        };

        if (withToken) authDevice.token = device.token;

        return authDevice;

    }

    connectDevice(device, returnToken) {
        device.connected = true;
        device.nonce = crypto.randomBytes(16).toString('base64');
        return this.authenticatedObject(device, returnToken);
    }

    updateToken(device) {
        this.devices.delete(device.token);
        device.token = crypto.randomBytes(32).toString("hex");
        this.devices.set(device.token, device);
    }

    unregister(token) {
        if (!token) return;
        if (this.devices.has(token)) {
            const device = this.devices.get(token);
            device.stopListenSensors();
        }
        console.log("unregister device");
        this.devices.delete(token);
    }

    registerWebAdmin(token, services) {
        if (!token) return;
        const webAdmin = this.createDeviceObject(token, services);
        webAdmin.isWebAdmin = true;
        webAdmin.connected = true;
        this.devices.set(token, webAdmin);
        return webAdmin;
    }

    registerDevice(services) {
        //Here generate a default token (will be changed later during connection/apairing)
        const device = this.createDeviceObject(crypto.randomBytes(32).toString("hex"), services);
        this.devices.set(device.token, device);
        return device;
    }

    getDevicesByuID(uID) {
        for (const device of this.devices.values()) {
            if (device.uID == uID) return device;
        }
        return null;
    }

    getDevicesByuIDs(uIDs) {

        if (!(Array.isArray(uIDs) && uIDs.length > 0)) return [];

        const devFound = [];
        for (const device of this.devices.values()) {
            if (uIDs.includes(device.uID)) devFound.push(device);
        }

        return devFound;

    }

    getNumberOfDevices() { return this.devices.size; }

    sensorsValueToSend(token, sensorValues) {

        if (!this.devices.has(token)) return;

        const sensorsToSend = new Map();
        const device = this.devices.get(token);

        if (!device.sensors) return sensorsToSend;
            
        for (const [id, data] of sensorValues) {

            if (!device.sensors.has(id)) continue;

            const sensorData = device.sensors.get(id);
            if (!sensorData.lastValue || sensorData.lastValue != data.value) {
                sensorData.lastValue = data.value;
                sensorsToSend.set(id, data);
            }

        }

        return sensorsToSend;
    }

    getDevices(forMessage = false) {

        const ds = [];

        for (const [id, device] of this.devices) {

            if (device.pairing) continue;

            if (!forMessage)
                ds.push(device);
            else
                ds.push({
                    uID: device.uID,
                    mac: device.mac,
                    connected: device.connected,
                    type: (device.isWebAdmin) ? "admin": "device"
                });
        }
        
        return ds;

    }

    getDevicesAuthenticated() {

        const ds = [];

        for (const [id, device] of this.devices) {
            if (device.connected) ds.push(device);
        }
        
        return ds;

    }

    setPeristent(device, persistent) {

        device.persistent = persistent;
        this.save();

    }

    load() {

        try {

            const persistantDevices = JSON.parse(fs.readFileSync(this.storePath, "utf8"));
            console.log(persistantDevices);

            if (Array.isArray(persistantDevices)) {

                for (const deviceOnFile of persistantDevices) {

                    const pDevice = this.createDeviceObject(deviceOnFile.token, this.services);
                    pDevice.name = deviceOnFile.name;
                    pDevice.mac = deviceOnFile.mac;
                    pDevice.connected = false;
                    this.devices.set(pDevice.token, pDevice);

                }

            }

        } 
        catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Unable to read paired-device store:", error);
            }
        }

    }

    save() {

        //We save only the persistent device
        const saveDevices = [];
        for (const device of this.devices.values()) {
            if (device.persistent) {
                saveDevices.push({
                    'token': device.token,
                    'mac': device.mac,
                    'name': device.name
                });
            }
        }

        fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
        fs.writeFileSync(this.storePath, JSON.stringify( saveDevices, null, 2), 'utf8');

    }


//     setName(mac, name) {
//         const device = this.find(mac);
//         if (!device || !device.paired) {
//             return null;
//         }

//         if (typeof name !== "string" || name.length > 32) {
//             return false;
//         }

//         device.name = name.trim();
//         this.save();
//         return this.toPublic(device);
//     }

}

module.exports = Devices;
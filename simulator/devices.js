const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { isAuthenticated } = require("./auth");
const { domainToASCII } = require("url");

const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

class Devices {

    constructor(services, storePath = process.env.PMGHUB_DEVICE_STORE_PATH || path.resolve(__dirname, "../data/paired-devices.json")) {

        this._services = services;
        this._devices = new Map();
        this._storePath = storePath;
        this.load();

    }

    getService() { return this._services; }

    static generateMacAddress() {
        return Array.from({ length: 6 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':');
    }

    createDeviceObject(services) {

        return {
            uID: crypto.randomUUID(),
            token: null,
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
            startListenSensors(listOfSensors = null, addSensorUnit = null) {

                const sensors = this.sensorsUsed();
                const sensorsData = new Map();
                
                if (!listOfSensors) {
                    for (const item of sensors) sensorsData.set(item.sensor.id, { 'lastValue': null, 'addUnits': null } );
                }
                else {
                    for (const sensorId of listOfSensors) sensorsData.set(sensorId, { 'lastValue': null, 'addUnits': null } );
                }

                if (addSensorUnit) {
                    console.log(addSensorUnit);
                    for(const sensorId in addSensorUnit) {
                        const sData = sensorsData.get(sensorId);
                        if (sData) sData.addUnits = addSensorUnit[sensorId];
                    }
                }

                this.sensors = sensorsData;
                this.listenSensors = true;
            },
            stopListenSensors() {
                this.sensors = null;
                this.listenSensors = false;
            },
            sensorsUsed() {
                return this.services.getSensors().get();
            },
            generateNonce() {

                const bytes = new Uint8Array(32);
                crypto.getRandomValues(bytes);

                this.nonce = btoa(String.fromCharCode(...bytes))
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_")
                    .replace(/=+$/, "");

            },
            updateToken() {
                this.token = crypto.randomBytes(32).toString("hex");
            }
        };

    }

    swapDevice(device_from, device_to) {

        device_to.token = device_from.token;
        device_to.isWebAdmin = device_from.isWebAdmin;
        device_to.listenSensors = device_from.listenSensors;
        device_to.connected = device_from.connected;
        device_to.pairing = device_from.pairing;
        device_to.persistent = device_from.persistent;
        device_to.name = device_from.name;
        device_to.mac = device_from.mac;
        device_to.sensors = device_from.sensors;
        device_to.nonce = device_from.nonce;

        this._devices.delete(device_from.uID);

        this.save();

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
        return this.authenticatedObject(device, returnToken);
    }

    disconnectDevice(device) {

        device.connected = false;
        device.stopListenSensors();

    }

    cleanMACDevices(deviceToKeep) {
        
        if (!deviceToKeep) return;

        for (const device of this._devices.values()) {
            if (device.uID == deviceToKeep.uID) continue;
            if (device.mac == deviceToKeep.mac) this.unregister(device);
        }

    }

    unregister(device) {
        if (!device) return;
        device.stopListenSensors();
        console.log(`unregister device ${device.uID}`);
        this._devices.delete(device.uID);
    }

    unregisterByUID(uID) {
        if (!uID) return;
        if (this._devices.has(uID)) {
            const device = this._devices.get(uID);
            device.stopListenSensors();
        }
        console.log(`unregister device ${uID}`);
        this._devices.delete(uID);
    }

    registerWebAdmin(token, services) {
        if (!token) return;
        const webAdmin = this.createDeviceObject(services);
        webAdmin.token = this.token;
        webAdmin.isWebAdmin = true;
        webAdmin.connected = true;
        this._devices.set(webAdmin.uID, webAdmin);
        return webAdmin;
    }

    registerDevice(services) {
        const device = this.createDeviceObject(services);
        this._devices.set(device.uID, device);
        return device;
    }

    getPersistentDeviceByMAC(mac) {
        if (mac) mac = mac.toLowerCase();
        for (const device of this._devices.values()) {
            if (device.persistent && device.mac == mac) return device;
        }
        return null;
    }

    getDeviceByuID(uID) {
        return this._devices.get(uID);
    }

    getNumberOfDevices() { return this._devices.size; }

    sensorsValueToSend(device, sensorValues, sensors) {

        if (!device) return;

        const sensorsToSend = new Map();

        if (!device.sensors) return sensorsToSend;
            
        for (const [id, data] of sensorValues) {

            if (!device.sensors.has(id)) continue;

            const sensorData = device.sensors.get(id);
            if (!sensorData.lastValue || sensorData.lastValue != data.value) {
                sensorData.lastValue = data.value;
                
                const dataToSend = (sensorData.addUnits) ? structuredClone(data) : data;
                if (sensorData.addUnits) {
                    dataToSend["uConv"] = {};
                    for(const unit of sensorData.addUnits) {
                        dataToSend.uConv[unit] = sensors.convertSensor(id, dataToSend.value, unit);
                    }
                }
                sensorsToSend.set(id, dataToSend);
            }

        }

        return sensorsToSend;

    }

    getDevices(forMessage = false) {

        const ds = [];

        for (const device of this._devices.values()) {

            if (!(device.isWebAdmin || device.persistent)) continue;

            if (!forMessage)
                ds.push(device);
            else
                ds.push({
                    uID: device.uID,
                    mac: device.mac,
                    connected: device.connected,
                    name: device.name,
                    type: (device.isWebAdmin) ? "admin": "device"
            });

        }
        
        return ds;

    }

    getDevicesAuthenticated() {

        const ds = [];

        for (const device of this._devices.values()) {
            if (device.connected) ds.push(device);
        }
        
        return ds;

    }

    setPersistent(device, persistent) {

        device.persistent = persistent;
        this.save();

    }

    load() {

        try {

            const persistantDevices = JSON.parse(fs.readFileSync(this._storePath, "utf8"));

            if (Array.isArray(persistantDevices)) {

                for (const deviceOnFile of persistantDevices) {

                    const pDevice = this.createDeviceObject(this._services);
                    pDevice.token = deviceOnFile.token;
                    pDevice.name = deviceOnFile.name;
                    pDevice.mac = deviceOnFile.mac;
                    pDevice.connected = false;
                    pDevice.persistent = true;
                    this._devices.set(pDevice.uID, pDevice);

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
        for (const device of this._devices.values()) {
            if (device.persistent && device.token) {
                saveDevices.push({
                    'token': device.token,
                    'mac': device.mac,
                    'name': device.name
                });
            }
        }

        fs.mkdirSync(path.dirname(this._storePath), { recursive: true });
        fs.writeFileSync(this._storePath, JSON.stringify( saveDevices, null, 2), 'utf8');

    }

}

module.exports = Devices;
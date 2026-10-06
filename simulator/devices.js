const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

class DeviceSimulator {

    constructor(storePath = process.env.PMGHUB_DEVICE_STORE_PATH || path.resolve(__dirname, "../data/paired-devices.json")) {

        this.devices = new Map();
        this.sensorsDataByDevice = new Map();

//         this.storePath = storePath;
//         this.devices = this.load();
    }

    createDeviceObject(token) {

        return {
            token: token,
            isWebAdmin: false,
            listenSensors: false
        };

    }

    unregister(token) {
        if (!token) return;
        this.devices.delete(token);
    }

    registerWebAdmin(token) {
        if (!token) return;
        const webAdmin = this.createDeviceObject(token);
        webAdmin.isWebAdmin = true;
        this.devices.set(token, webAdmin);
    }

    getDevice(token) {
        return this.devices.get(token) ?? null;
    }

    isWebAdmin(token) {
        if (!this.devices.has(token)) return false;
        return this.devices.get(token).isWebAdmin;
    }

    startListenSensors(token, sensors) {
        if (!this.devices.has(token)) return;

        const sensorsData = new Map();
        for (const item of sensors) sensorsData.set(item.sensor.id, { 'lastValue': null } );
        this.sensorsDataByDevice.set(token, sensorsData);
     
        this.devices.get(token).listenSensors = true;
    }

    stopListenSensors(token) {
        if (!this.devices.has(token)) return;
        this.devices.get(token).listenSensors = false;
        this.sensorsDataByDevice.delete(token);
    }

    sensorsValueToSend(token, sensorValues) {

        const now = Date.now();
        const sensorsToSend = new Map();

        const sensorsData = this.sensorsDataByDevice.get(token);
        if (sensorsData) {
            
            for (const [id, data] of sensorValues) {

                if (!sensorsData.has(id)) continue;

                const sensorData = sensorsData.get(id);
                if (!sensorData.lastValue || sensorData.lastValue != data.value) {
                    sensorData.lastValue = data.value;
                    sensorsToSend.set(id, data);
                }

            }

        }

        return sensorsToSend;
    }

//     load() {
//         try {
//             const data = JSON.parse(fs.readFileSync(this.storePath, "utf8"));
//             if (!Array.isArray(data.devices)) {
//                 throw new Error("Invalid paired-device store");
//             }

//             return data.devices.map(device => ({
//                 mac: device.mac,
//                 name: device.name || "",
//                 paired: device.paired !== false,
//                 token: device.token || null,
//                 connected: false
//             }));
//         } catch (error) {
//             if (error.code !== "ENOENT") {
//                 console.error("Unable to read paired-device store:", error);
//             }

//             return [];
//         }
//     }

//     save() {
//         fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
//         fs.writeFileSync(
//             this.storePath,
//             `${JSON.stringify({ devices: this.devices }, null, 2)}\n`,
//             { mode: 0o600 }
//         );
//     }

//     toPublic(device) {
//         const { token, ...publicDevice } = device;
//         return { ...publicDevice, paired: Boolean(token) || device.paired };
//     }

//     find(mac) {
//         if (typeof mac !== "string") {
//             return undefined;
//         }

//         return this.devices.find(item => item.mac.toLowerCase() === mac.toLowerCase());
//     }

//     isPaired(mac) {
//         const device = this.find(mac);
//         return Boolean(device && device.paired && device.token);
//     }

//     getAll() {
//         return this.devices.filter(device => device.paired).map(device => this.toPublic(device));
//     }

//     getPending() {
//         return this.devices.filter(device => !device.paired).map(device => this.toPublic(device));
//     }

//     requestPairing(mac, name = "") {
//         if (typeof mac !== "string" || !macPattern.test(mac)) {
//             return null;
//         }

//         const existing = this.find(mac);
//         if (existing) {
//             if (existing.paired) {
//                 return { paired: true, device: this.toPublic(existing) };
//             }

//             return { paired: false, device: this.toPublic(existing) };
//         }

//         if (typeof name !== "string" || name.length > 32) {
//             return null;
//         }

//         const device = {
//             mac: mac.toUpperCase(),
//             name: name.trim(),
//             paired: false,
//             token: null,
//             connected: true
//         };
//         this.devices.push(device);
//         this.save();
//         return { paired: false, device: this.toPublic(device) };
//     }

//     approve(mac) {
//         const device = this.find(mac);
//         if (!device || device.paired) {
//             return null;
//         }

//         device.paired = true;
//         device.token = crypto.randomBytes(32).toString("hex");
//         device.connected = false;
//         this.save();
//         return { device: this.toPublic(device), token: device.token };
//     }

//     isTokenValid(mac, token) {
//         const device = this.find(mac);
//         return Boolean(device && device.paired && device.token && token === device.token);
//     }

//     setConnected(mac, connected) {
//         const device = this.find(mac);
//         if (!device || !device.paired) {
//             return null;
//         }

//         device.connected = Boolean(connected);
//         this.save();
//         return this.toPublic(device);
//     }

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

//     reject(mac) {
//         const index = this.devices.findIndex(
//             item => item.mac.toLowerCase() === String(mac).toLowerCase()
//         );

//         if (index === -1) {
//             return null;
//         }

//         const [device] = this.devices.splice(index, 1);
//         this.save();
//         return this.toPublic(device);
//     }

//     rejectPending(mac) {
//         const device = this.find(mac);
//         if (!device || device.paired) {
//             return null;
//         }

//         return this.reject(device.mac);
//     }

}

module.exports = DeviceSimulator;
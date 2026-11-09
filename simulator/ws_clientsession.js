/********************
 * 
 * WebSocket Client Session
 * YBI 11/10/2026
 * YBI 05/11/2026
 * 
 */
const WebSocket = require('ws');
const crypto = require("crypto");

class WSClientSession {

    constructor(device, ws) {

        this._ws = ws;
        this._device = device;

        // Correct :
        ws.on('message', (data) => {
            this.onMessage(data);
        });

    }

    getDevice() { return this._device; }
    getWebSocket() { return this._ws; }
    getId() { return this._device.uID; }

    destroyWebSocket() {
        this._ws = null;
    }

    isConnected() {
        return this._device.connected && (this._ws && this._ws.readyState === WebSocket.OPEN);
    }

    onMessage(rawMessage) {

        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            this._ws.close(4100, "Invalid JSON message");
            return;
        }

        console.log("WSS Message:" + message.type + ", data:");
        console.log(message.data);

        if (!message.type) {
            this._ws.close(4101, "Invalid message type");
            return;
        }

        let boolInvalidCommand = false;
        const pairing = this._device.services.getPairing();
        const csManager = this._device.services.getCSManager();
        const devices = this._device.services.getDevices();

        switch(message.type) {

            case "webadmin.init":

                if (this._device.isWebAdmin) {
                    
                    const initData = { 'init': true, 'sensors': this._device.services.getSensors().get(), 'devices': devices.getDevices(true), 'units': this._device.services.getSensors().getAllUnits() };

                    //If some pairing device are waiting return them
                    if (pairing.pairingDeviceCount()) initData.pairingrequests = pairing.getPairingDevices(true);

                    this._ws.send(JSON.stringify({ type: "initialize", data: initData }));
                    csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));

                }
                else {
                    boolInvalidCommand = true;
                }
                break;
            
            case "ping":

                if (this._ws) this._ws.send(JSON.stringify({ type: "pong" }));
                
                break;

            case "sensors.get":

                const sensorsList = Array.isArray(message.data) ? message.data : [];
                this._ws.send(JSON.stringify({ type: "sensors.list", "data": this._device.services.getSensors().get(sensorsList, true) }));
                break;

            case "sensors.setunit":
                this._device.updateUnitSensors(message.data);
                break;

            case "sensors.read":

                if (this._device.isWebAdmin) {
                    this._device.startListenSensors();
                }
                else {
                    this._device.startListenSensors(Array.isArray(message.data) ? message.data : [], message.addSensorUnit);
                }

                break;
            
            case "device.identify":

                if (this._device.isWebAdmin) {
                    if (message.data && message.data.uID) {
                        const device = devices.getDeviceByuID(message.data.uID);
                        if (device.persistent) {
                            csManager.sendToDevice(device.uID,JSON.stringify({ type: "device.identify" }));
                        }
                    }
                }
                else {
                    boolInvalidCommand = true;
                }

                break;

            case "device.setname":

                if (this._device.isWebAdmin) {
                    if (message.data && message.data.uID && message.data.name !== null) {
                        const device = devices.getDeviceByuID(message.data.uID);
                        if (device.persistent) {
                            device.name = message.data.name;
                            devices.save();
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));
                        }
                    }
                }
                else {
                    boolInvalidCommand = true;
                }

                break;

            case "pairing.reject":
            case "device.reject":

                if (this._device.isWebAdmin) {
                    if (message.data && message.data.uID) {
                        console.log("reject device: " + message.data.uID);
                        const deviceRejected = devices.getDeviceByuID(message.data.uID);
                        devices.setPersistent(deviceRejected, false);
                        if (!csManager.close(deviceRejected.uID)) {
                            //if return false, device is not connected so clean here
                            devices.unregister(deviceRejected);
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));
                        }
                        console.log("la2");
                    }
                }
                else {
                    boolInvalidCommand = true;
                }

                break;

            case "pairing.window":

                if (this._device.isWebAdmin) {
                    
                    if (!pairing.windowIsOpened() && message.data == "start") {
                        console.log("Start Pairing");
                        pairing.openWindow();
                    }
                    else if (pairing.windowIsOpened() && message.data == "stop") {
                        console.log("Stop Pairing");
                        pairing.closeWindow();
                        //remove all pairing devices
                        this._device.services.removeAllPairingDevices();
                    }

                }
                else {
                    boolInvalidCommand = true;
                }
                break;
            
            case "pairing.code":
                
                if (this._device.isWebAdmin) {
                    if (message.data && message.data.uID) {
                        
                        const check = pairing.checkPairingCode(message.data.uID, message.data.code);
                        if (check.validate) {

                            //Device paired!!!
                            console.log("Device accepted");

                            const devicePaired = devices.getDeviceByuID(message.data.uID);

                            pairing.removePairindDevice(devicePaired);
                            devicePaired.updateToken();
                            devices.setPersistent(devicePaired, true);

                            const devicePairedWS = csManager.getById(devicePaired.uID);
                            devicePairedWS.client.getWebSocket().send(JSON.stringify({ type: "device.authenticated", "data": devices.connectDevice(devicePaired, true) }));

                            //Remove all previous MAC (if there is a token update)
                            devices.cleanMACDevices(devicePaired);

                            //Update pairing list on webAdmin
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": pairing.getPairingDevices(true) }));
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));

                        }
                        else {
                            if (check.remainingAttempts) {
                                this._ws.send(JSON.stringify({ type: "pairing.wrongcode", "data": { 'uID': message.data.uID , 'remainingAttempts': check.remainingAttempts } }));
                            }
                            else {
                                //Reject
                                csManager.close(message.data.uID);
                            }
                        }

                    }
                }
                else {
                    boolInvalidCommand = true;
                }
                break;

            case "device.connect":

                // Standard
                if (message.data && message.data.mac && message.data.nonce && message.data.signature) {

                    console.log("Device connection - init");
                    const device = devices.getPersistentDeviceByMAC(message.data.mac);

                    if (device) {
                        console.log(`Device ${message.data.mac} found`);
                        //calculate signature
                        const expected = crypto.createHmac("sha256", device.token).update(message.data.nonce).digest("hex");
                        console.log(`${device.token} - ${message.data.nonce}`);
                        if (expected == message.data.signature) {
                            console.log(`Device connection - Signature validated`);
                            console.log(`Device ${message.data.mac} accepted`);
                            //Update the connection device with device
                            devices.swapDevice(device, this._device);
                            this._device.nonce = message.data.nonce; //keep the new nonce
                            this._ws.send(JSON.stringify({ type: "device.authenticated", "data": devices.connectDevice(this._device, false) }));
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));
                            break;
                        }  
                        else {
                            console.log(`Device connection - Signature error`);
                        }
                    }
                    else {
                        console.log(`Device connection - ${message.data.mac} not found`);
                    }

                }

                //////////////////////////////////////////////////
                // Pairing

                const checkPairing = pairing.checkDevicePairingConnect(message.data);    
                if (checkPairing !== true) {
                    this._ws.send(JSON.stringify({ type: "pairing.rejected", "data": checkPairing }));
                    this._ws.close(4103, "Pairing not available");
                    return;
                }
                
                console.log("PAIRING - Request accepted");
                
                this._device.mac = message.data.mac.toLowerCase();

                //save the pairing request
                pairing.addPairingDevice(this._device, message.data);

                // Return to all WebAdmin the list of pairing devices
                csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": pairing.getPairingDevices(true) }));

                this._ws.send(JSON.stringify({ type: "pairing.pending", "data": null }));

                break;
            
            default:
                boolInvalidCommand = true;

        }

        if (boolInvalidCommand) {
            this._ws.close(4102, "Invalid Command");
        }

    }

}

module.exports = WSClientSession;

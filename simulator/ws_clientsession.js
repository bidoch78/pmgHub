/********************
 * 
 * WebSocket Client Session
 * YBI 11/10/2026
 * 
 */
const WebSocket = require('ws');
const crypto = require("crypto");

class WSClientSession {

    constructor(device, ws) {

        this.ws = ws;
        this.device = device;

        // Correct :
        ws.on('message', (data) => {
            this.onMessage(data);
        });

    }

    isConnected() {
        return this.device.connected && (this.ws && this.ws.readyState === WebSocket.OPEN);
    }

    getId() { return this.device.uID; }

    onMessage(rawMessage) {

        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            this.ws.close(4100, "Invalid JSON message");
            return;
        }

        console.log("WSS Message:" + message.type + ", data:");
        console.log(message.data);

        if (!message.type) {
            this.ws.close(4101, "Invalid message type");
            return;
        }

        let boolInvalidCommand = false;
        const pairing = this.device.services.getPairing();
        const csManager = this.device.services.getCSManager();
        const devices = this.device.services.getDevices();

        switch(message.type) {

            case "webadmin.init":

                if (this.device.isWebAdmin) {
                    
                    const initData = { 'init': true, 'sensors': this.device.services.getSensors().get(), 'devices': devices.getDevices(true) };

                    //If some pairing device are waiting return them
                    if (pairing.pairingDeviceCount()) initData.pairingrequests = pairing.getPairingDevices(true);

                    this.ws.send(JSON.stringify({ type: "initialize", data: initData }));
                    csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));

                }
                else {
                    boolInvalidCommand = true;
                }
                break;

            case "sensors.get":

                this.ws.send(JSON.stringify({ type: "sensors.list", "data": this.device.sensorsUsed() }));
                break;

            case "sensors.read":

                if (this.device.isWebAdmin) {
                    this.device.startListenSensors();
                }
                else {
                    this.device.startListenSensors(Array.isArray(message.data) ? message.data : []);
                }

                break;
            
            case "device.setname":

                if (this.device.isWebAdmin) {
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

            case "device.reject":

                if (this.device.isWebAdmin) {
                    if (message.data && message.data.uID) {
                        console.log("reject device: " + message.data.uID);
                        const deviceRejected = devices.getDeviceByuID(message.data.uID);
                        devices.setPersistent(deviceRejected, false);
                        if (!csManager.close(deviceRejected.uID)) {
                            //if return false, device is not connected so clean here
                            devices.unregister(deviceRejected.token);
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));
                        }
                    }
                }
                else {
                    boolInvalidCommand = true;
                }

                break;

            case "pairing.window":

                if (this.device.isWebAdmin) {
                    
                    if (!pairing.windowIsOpened() && message.data == "start") {
                        console.log("Start Pairing");
                        pairing.openWindow();
                    }
                    else if (pairing.windowIsOpened() && message.data == "stop") {
                        console.log("Stop Pairing");
                        pairing.closeWindow();
                        //remove all pairing devices
                        this.device.services.removeAllPairingDevices();
                    }

                }
                else {
                    boolInvalidCommand = true;
                }
                break;
            
            case "pairing.code":
                
                if (this.device.isWebAdmin) {
                    if (message.data && message.data.uID) {
                        
                        const check = pairing.checkPairingCode(message.data.uID, message.data.code);
                        if (check.validate) {

                            //Device paired!!!
                            console.log("Device accepted");

                            const devicePaired = devices.getDeviceByuID(message.data.uID);

                            pairing.removePairindDevice(devicePaired);
                            devices.updateToken(devicePaired);
                            devices.setPersistent(devicePaired, true);

                            const devicePairedWS = csManager.getById(devicePaired.uID);
                            devicePairedWS.client.ws.send(JSON.stringify({ type: "device.authenticated", "data": devices.connectDevice(devicePaired, true) }));

                            //Update pairing list on webAdmin
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": pairing.getPairingDevices(true) }));
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "devices.list", "data": devices.getDevices(true) }));

                        }
                        else {
                            if (check.remainingAttempts) {
                                this.ws.send(JSON.stringify({ type: "pairing.wrongcode", "data": { 'uID': message.data.uID , 'remainingAttempts': check.remainingAttempts } }));
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

            case "pairing.reject":

                if (this.device.isWebAdmin) {
                    if (message.data && message.data.uID) {
                        if (!csManager.close(message.data.uID)) {
                            //if return false, device is not connected so clean here
                            const deviceRejected = devices.getDeviceByuID(message.data.uID);
                            devices.unregister(deviceRejected.token);
                            csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": pairing.getPairingDevices(true) }));
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
                    const device = devices.getDeviceByMAC(message.data.mac);

                    if (device) {
                        console.log(`Device ${message.data.mac} found`);
                        //calculate signature
                        const expected = crypto.createHmac("sha256", device.token).update(message.data.nonce).digest("hex");
                        if (expected == message.data.signature) {
                            console.log(`Device connection - Signature validated`);
                            console.log(`Device ${message.data.mac} accepted`);
                            //Update the connection device with device
                            devices.swapDevice(device, this.device);
                            this.ws.send(JSON.stringify({ type: "device.authenticated", "data": devices.connectDevice(this.device, true) }));
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

                // Pairing

                const checkPairing = pairing.checkDevicePairingConnect(message.data);    
                if (checkPairing !== true) {
                    this.ws.send(JSON.stringify({ type: "pairing.rejected", "data": checkPairing }));
                    this.ws.close(4103, "Pairing not available");
                    return;
                }
                
                console.log("PAIRING - Request accepted");
                
                this.device.mac = message.data.mac.toLowerCase();

                //save the pairing request
                pairing.addPairingDevice(this.device, message.data);

                // Return to all WebAdmin the list of pairing devices
                csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": pairing.getPairingDevices(true) }));

                this.ws.send(JSON.stringify({ type: "pairing.pending", "data": null }));

                break;
            
            default:
                boolInvalidCommand = true;

        }

        if (boolInvalidCommand) {
            this.ws.close(4102, "Invalid Command");
        }

    }

}

module.exports = WSClientSession;

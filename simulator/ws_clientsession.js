/********************
 * 
 * WebSocket Client Session
 * YBI 11/10/2026
 * 
 */
const WebSocket = require('ws');

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
        return this.device.isConnected && (this.ws && this.ws.readyState === WebSocket.OPEN);
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

        switch(message.type) {

            case "webadmin.init":

                if (this.device.isWebAdmin) {
                    
                    const initData = { 'init': true, 'sensors': this.device.services.getSensors().get() };
//                     if (pendingDeviceSockets.size) {
//                         initData.pairingrequests = [];
//                         for (const [mac, data] of pendingDeviceSockets) {
//                             initData.pairingrequests.push({ 'mac': mac, 'pairingCode': data.pairingCode });
//                         }
//                     }

//                     // initData.pairingrequests = [];
//                     // initData.pairingrequests.push({ 'mac': "02:4A:7D:91:B3:E8", pairingCode: 12342354 });
//                     // initData.pairingrequests.push({ 'mac': "02:C1:56:AF:28:9D", pairingCode: 77778888 });

                    this.ws.send(JSON.stringify({ type: "initialize", data: initData }));

                }
                else {
                    boolInvalidCommand = true;
                }
                break;

            case "sensors.get":

                this.ws.send(JSON.stringify({ type: "sensors.list", "data": this.device.sensorsUsed() }));
                break;

            case "sensors.read":
                
                this.device.startListenSensors();
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
                    }

                }
                else {
                    boolInvalidCommand = true;
                }
                break;

            case "device.connect":

                const checkPairing = pairing.checkDevicePairingConnect(message.data);    
                if (checkPairing !== true) {
                    this.ws.send(JSON.stringify({ type: "pairing.rejected", "data": checkPairing }));
                    return;
                }
                
                console.log("PAIRING - Request accepted")

                //save the pairing request
                const mac = message.data.mac.toLowerCase();

                pairing.addPairingDevice(this.device, message.data);

                // Return to all WebAdmin the list of pairing devices
                csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.requests", "data": pairing.getPairingDevices(true) }))

//                 //     pendingDeviceSockets.set(mac, { 'pairingCode': message.data.pairingCode, 'socket': ws });
                    
//                 //     //Sent pairing requests to webAdmin (resend all)
//                 //     //const webAdminSockets = getWebAdminSockets();
//                 //     //for (const sWA of webAdminSockets) sendPairingRequest(sWA);

//                 //     //Sent pending to device
//                 //     ws.send(JSON.stringify({ type: "pairing.pending", data: null } ));
//                 //     return;
                
//                 // }

                this.ws.send(JSON.stringify({ type: "pairing.pending", "data": null }));

                break;

        }

        if (boolInvalidCommand) this.ws.close(4102, "Invalid Command"); 

    }

}

module.exports = WSClientSession;

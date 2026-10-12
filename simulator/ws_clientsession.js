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
                
                const pairing = this.device.services.getPairing();
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
            

        }

        if (boolInvalidCommand) this.ws.close(4102, "Invalid Command"); 

    }

}

module.exports = WSClientSession;

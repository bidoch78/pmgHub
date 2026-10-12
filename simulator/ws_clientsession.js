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

    getId() { return this.device.uID; }

    onMessage(data) {



    }


}

module.exports = WSClientSession;

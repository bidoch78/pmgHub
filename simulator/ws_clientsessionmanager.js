/********************
 * 
 * WebSocket Client Session Manager
 * YBI 11/10/2026
 * 
 */
const config = require("./config");
const WebSocket = require('ws');

const DEBUG_HEARTBEAT = config.DEBUG_HEARTBEAT === false;

class WSClientSessionManager {

    constructor(services, pingInterval = 10000, pongTimeout = 1000, checkInterval = 250) {

        this.cSockets = new Map();

        this.services = services;
        this.pingInterval = pingInterval;
        this.pongTimeout = pongTimeout;
        this.checkInterval = checkInterval;

        this.timer = setInterval(() => { this.checkHeartbeat(); }, this.checkInterval);

    }

    add(client) {

        const clientUID = client.getId();

        if (this.cSockets.has(clientUID)) return;

        const dtNow = Date.now();
        const cSocketData = {
            client: client,
            heartbeat: {
                lastPing: 0,
                lastPong: dtNow,
                awaitingPong: false,
                pongDeadline: 0,
                nextPing: dtNow + this.pingInterval,
                onPong: null
            },
            onClose: null
        };

        cSocketData.heartbeat.onPong = () => {

            if (!cSocketData.heartbeat.awaitingPong) return;

            if (DEBUG_HEARTBEAT) console.log(`Heartbeat receive pong: ${cSocketData.client.getId()}` );

            cSocketData.heartbeat.lastPong = Date.now();
            cSocketData.heartbeat.awaitingPong = false;
            cSocketData.heartbeat.pongDeadline = 0;
            cSocketData.heartbeat.nextPing = cSocketData.heartbeat.lastPong + this.pingInterval;

        };

        cSocketData.onClose = () => {
            console.log(`WSS Close (${clientUID})`);
            this.services.deviceCloseConnection(clientUID);
            this.remove(clientUID);
        };

        client.ws.on('pong', cSocketData.heartbeat.onPong);
        client.ws.on('close', cSocketData.onClose);
        
        this.cSockets.set(clientUID, cSocketData);

        console.log(`Client connected: ${clientUID}`);
        console.log(`-- NB SESSIONS: ` + this.cSockets.size);

    }

    close(clientUID, error = null, message = null) {

        const cSocketData = this.cSockets.get(clientUID);

        if (!cSocketData) return;        

        if (cSocketData.client.isConnected()) cSocketData.client.ws.close(error ?? 4200, message ?? "device.reject");

    }

    remove(clientUID) {

        const cSocketData = this.cSockets.get(clientUID);

        if (!cSocketData) return;

        console.log("csManager:remove");
        this.cSockets.delete(clientUID);
        
        cSocketData.client.device.connected = false;

        //Remove events
        cSocketData.client.ws.off('pong', cSocketData.heartbeat.onPong);
        cSocketData.client.ws.off('close', cSocketData.onClose);

        cSocketData.client.ws = null;

        console.log(`Client removed: ${clientUID}`);
        console.log(`-- NB SESSIONS: ` + this.cSockets.size);

    }

    checkHeartbeat() {
        
        const now = Date.now();

        for (const cSocketData of this.cSockets.values()) {

            const ws = cSocketData.client.ws;
            const clientUID = cSocketData.client.getId();
                
            if (!ws) continue;
            
            if (ws.readyState === WebSocket.CLOSED) {
                this.remove(cSocketData.client.getId());
                continue;
            }

            if (ws.readyState !== WebSocket.OPEN) continue;

            // Waiting a Pong
            if (cSocketData.heartbeat.awaitingPong) {

                if (now >= cSocketData.heartbeat.pongDeadline) {

                    if (DEBUG_HEARTBEAT) console.warn(`Heartbeat timeout: ${clientUID}` );
                    this.remove(clientUID);
                    ws.terminate();
                    continue;
                    
                }

            }

            // wait
            if (now < cSocketData.heartbeat.nextPing) continue;

            cSocketData.heartbeat.awaitingPong = true;
            cSocketData.heartbeat.lastPing = now;
            cSocketData.heartbeat.pongDeadline = now + this.pongTimeout;

            // Send ping
            try {
                if (DEBUG_HEARTBEAT) console.log(`Heartbeat ping: ${clientUID}` );
                ws.ping();
            } catch (error) {
                if (DEBUG_HEARTBEAT) console.error( `Ping error ${clientUID}:`, error);
                this.remove(clientUID);
                ws.terminate();
            }

        }

    }

    getById(clientUID) { return this.cSockets.get(clientUID); }

    broadcastToWebAdmin(message) {
        
        for (const cSocketData of this.cSockets.values()) {
            if (cSocketData.client.device.isWebAdmin && cSocketData.client.isConnected()) {
                cSocketData.client.ws.send(message);
            }
        }

    }

    sendToDevice(clientUID, message) {

        for (const cSocketData of this.cSockets.values()) {
            if (cSocketData.client.getId() == clientUID && cSocketData.client.isConnected()) {
                cSocketData.client.ws.send(message);
            }
        }

    }

    countSessions() { return this.cSockets.size; }

    destroy() {

        clearInterval(this.timer);

        for (const [uID, cSocketData] of [...this.cSockets.entries()]) {
            cSocketData.client.ws.terminate();
            this.remove(uID);
        }

    }

}

module.exports = WSClientSessionManager;

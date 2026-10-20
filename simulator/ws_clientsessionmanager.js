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

    constructor(services, pingInterval = 10000, pongTimeout = 1000, checkInterval = 250, authenticationTimeout = 250) {

        this.cSockets = new Map();

        this.services = services;
        this.pingInterval = pingInterval;
        this.pongTimeout = pongTimeout;
        this.checkInterval = checkInterval;
        this.authenticationTimeout = authenticationTimeout;
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
            createAt: dtNow,
            onClose: null,
            onMessage: null
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

        cSocketData.onMessage = () => {
           cSocketData.createAt = null;
        };

        client.ws.on('pong', cSocketData.heartbeat.onPong);
        client.ws.on('close', cSocketData.onClose);
        client.ws.on('message', cSocketData.onMessage);
        
        this.cSockets.set(clientUID, cSocketData);

        console.log(`Client connected: ${clientUID}`);
        console.log(`-- NB SESSIONS: ` + this.cSockets.size);

    }

    close(clientUID, error = null, message = null) {

        const cSocketData = this.cSockets.get(clientUID);

        if (!cSocketData) return false;        

        if (cSocketData.client.isConnected()) cSocketData.client.ws.close(error ?? 4200, message ?? "device.reject");

        return true;

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
        cSocketData.client.ws.off('message', cSocketData.onMessage);

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
                this.services.deviceCloseConnection(clientUID);
                this.remove(clientUID);
                continue;
            }

            if (ws.readyState !== WebSocket.OPEN) continue;

            // Check if there is an inactivity after open connexion
            if (cSocketData.createAt && (now - cSocketData.createAt) > this.authenticationTimeout) {
                console.log(`Authentication timeout: ${clientUID}` );
                this.services.deviceCloseConnection(clientUID);
                this.remove(clientUID);
                ws.terminate();
                continue;
            }

            // Waiting a Pong
            if (cSocketData.heartbeat.awaitingPong) {

                if (now >= cSocketData.heartbeat.pongDeadline) {

                    if (DEBUG_HEARTBEAT) console.log(`Heartbeat timeout: ${clientUID}` );
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
                this.services.deviceCloseConnection(clientUID);
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

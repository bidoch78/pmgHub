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

        this._cSockets = new Map();

        this._services = services;
        this._pingInterval = pingInterval;
        this._pongTimeout = pongTimeout;
        this._checkInterval = checkInterval;
        this._authenticationTimeout = authenticationTimeout;
        this._lastHeartBeatCall = null;

    }

    add(clientSession) {

        const clientUID = clientSession.getId();

        if (this._cSockets.has(clientUID)) return;

        const dtNow = Date.now();
        const cSocketData = {
            client: clientSession,
            heartbeat: {
                lastPing: 0,
                lastPong: dtNow,
                awaitingPong: false,
                pongDeadline: 0,
                nextPing: dtNow + this._pingInterval,
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
            cSocketData.heartbeat.nextPing = cSocketData.heartbeat.lastPong + this._pingInterval;

        };

        cSocketData.onClose = () => {
            console.log(`WSS Close (${clientUID})`);
            this._services.deviceCloseConnection(clientUID);
            this.remove(clientUID);
        };

        cSocketData.onMessage = () => {
            cSocketData.createAt = null;
        };

        const clientWebSocket = clientSession.getWebSocket();

        clientWebSocket.on('pong', cSocketData.heartbeat.onPong);
        clientWebSocket.on('close', cSocketData.onClose);
        clientWebSocket.on('message', cSocketData.onMessage);
        
        this._cSockets.set(clientUID, cSocketData);

        console.log(`Client connected: ${clientUID}`);
        console.log(`-- NB SESSIONS: ` + this._cSockets.size);

    }

    close(clientUID, error = null, message = null) {

        const cSocketData = this._cSockets.get(clientUID);
        if (!cSocketData) return false;

        const clientWS = cSocketData.client.getWebSocket();
        if (cSocketData.client.isConnected() && clientWS) clientWS.close(error ?? 4200, message ?? "device.reject");

        return true;

    }

    remove(clientUID) {

        const cSocketData = this._cSockets.get(clientUID);

        if (!cSocketData) return false;

        console.log("csManager:remove");
        this._cSockets.delete(clientUID);
        
        cSocketData.client.getDevice().connected = false;

        //Remove events
        const clientWebSocket = cSocketData.client.getWebSocket();

        clientWebSocket.off('pong', cSocketData.heartbeat.onPong);
        clientWebSocket.off('close', cSocketData.onClose);
        clientWebSocket.off('message', cSocketData.onMessage);

        cSocketData.client.destroyWebSocket();

        console.log(`Client removed: ${clientUID}`);
        console.log(`-- NB SESSIONS: ` + this._cSockets.size);

        return true;
        
    }

    checkHeartbeat() {
        
        const now = Date.now();

        if (this._lastHeartBeatCall && (this._lastHeartBeatCall - now) < this._checkInterval) return;
        this._lastHeartBeatCall = now;

        for (const cSocketData of this._cSockets.values()) {

            const ws = cSocketData.client.getWebSocket();
            const clientUID = cSocketData.client.getId();
                
            if (!ws) continue;
            
            if (ws.readyState === WebSocket.CLOSED) {
                this._services.deviceCloseConnection(clientUID);
                this.remove(clientUID);
                continue;
            }

            if (ws.readyState !== WebSocket.OPEN) continue;

            // Check if there is an inactivity after open connexion
            if (cSocketData.createAt && (now - cSocketData.createAt) > this._authenticationTimeout) {
                console.log(`Authentication timeout: ${clientUID}` );
                this._services.deviceCloseConnection(clientUID);
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
            cSocketData.heartbeat.pongDeadline = now + this._pongTimeout;

            // Send ping
            try {
                if (DEBUG_HEARTBEAT) console.log(`Heartbeat ping: ${clientUID}` );
                ws.ping();
            } catch (error) {
                if (DEBUG_HEARTBEAT) console.error( `Ping error ${clientUID}:`, error);
                this._services.deviceCloseConnection(clientUID);
                this.remove(clientUID);
                ws.terminate();
            }

        }

    }

    getById(clientUID) { return this._cSockets.get(clientUID); }

    broadcastToWebAdmin(message) {
        
        for (const cSocketData of this._cSockets.values()) {
            const clientDevice = cSocketData.client.getDevice();
            if (clientDevice.isWebAdmin && cSocketData.client.isConnected()) {
                cSocketData.client.getWebSocket().send(message);
            }
        }

    }

    sendToDevice(clientUID, message) {

        for (const cSocketData of this._cSockets.values()) {
            if (cSocketData.client.getId() == clientUID && cSocketData.client.isConnected()) {
                cSocketData.client.getWebSocket().send(message);
            }
        }

    }

    countSessions() { return this._cSockets.size; }

    destroy() {

        for (const [uID, cSocketData] of [...this._cSockets.entries()]) {
            cSocketData.client.ws.terminate();
            this.remove(uID);
        }

    }

}

module.exports = WSClientSessionManager;

const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const config = require("./config");

const SessionManager = require("./sessions");
const SensorSimulator = require("./sensors");
const DeviceSimulator = require("./devices");

const {
    isValidPassword,
    hasCredentials,
    initializeCredentials
} = require("./credentials");

const {
    getSessionToken,
    isAuthenticated,
    setSessionCookie,
    clearSessionCookie,
    getSessionTypeAuthenticated
} = require("./auth");

const sessions = new SessionManager(
    config.auth.maxSessions,
    config.auth.sessionTimeoutMs
);

const sensors = new SensorSimulator();
const devices = new DeviceSimulator();

// const pairedDeviceSockets = new Map();
// const pendingDeviceSockets = new Map();
// const pendingPairingCodes = new Map();
// const pendingPairingAttempts = new Map();
// const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;
// const pairingWindowMs = Number(process.env.PAIRING_WINDOW_MS || 60_000);
// let pairingWindowExpiresAt = 0;
// let pairingWindowTimer = null;

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

function sendJson(res, statusCode, data) {
    
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));

}

function readJsonBody(req) {

    return new Promise((resolve, reject) => {
    
        let body = "";

        req.on("data", chunk => {
             
            body += chunk;

            if (body.length > 1024 * 64) {
                reject(new Error("Payload too big"));
                req.destroy();
            }

        });

        req.on("end", () => {
            try {
                 resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error("JSON invalide"));
            }
        });

        req.on("error", reject);

    });

}

// function isPairingWindowOpen() {
//     return Date.now() < pairingWindowExpiresAt;
// }

// function closePendingPairingRequests(reason) {
//     for (const [mac, ws] of pendingDeviceSockets) {
//         pendingDeviceSockets.delete(mac);
//         pendingPairingCodes.delete(mac);
//         pendingPairingAttempts.delete(mac);
//         devices.rejectPending(mac);
//         if (ws.readyState === 1) {
//             ws.send(JSON.stringify({ type: "pairing.rejected", reason }));
//             ws.close(4005, reason);
//         }
//     }
// }

// function disablePairingWindow(reason = "PAIRING_WINDOW_CLOSED") {
//     pairingWindowExpiresAt = 0;
//     if (pairingWindowTimer) {
//         clearTimeout(pairingWindowTimer);
//         pairingWindowTimer = null;
//     }
//     closePendingPairingRequests(reason);
// }

// function enablePairingWindow() {
//     if (pairingWindowTimer) clearTimeout(pairingWindowTimer);
//     pairingWindowExpiresAt = Date.now() + pairingWindowMs;
//     pairingWindowTimer = setTimeout(() => {
//         disablePairingWindow("PAIRING_WINDOW_EXPIRED");
//     }, pairingWindowMs);
//     pairingWindowTimer.unref?.();
// }

// function pairingWindowStatus() {
//     return {
//         open: isPairingWindowOpen(),
//         expiresAt: isPairingWindowOpen() ? pairingWindowExpiresAt : null,
//         durationMs: pairingWindowMs
//     };
// }

function returnFile(res, relativePath) {

    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(config.webRoot, safePath);

    if (!filePath.startsWith(config.webRoot)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (err, data) => {

        if (err) {
            res.writeHead(err.code === "ENOENT" ? 404 : 500);
            res.end(err.code === "ENOENT" ? "File not found" : "Internal server error (1)");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();

        res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });

        res.end(data);

    });

}

function isWebFile(relativePath) {

    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(config.webRoot, safePath);

    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()

}

const server = http.createServer(async (req, res) => {
    
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    
    // -------------------------------
    // ---- WEB
    // ----

    // ---------- STATIC ASSETS ----------

    console.log(url.href);
    //console.log(url);

    const webFile = url.pathname.slice(1);

    // ----------  WEB FILES (if file exists inside web folder) ----------
    if (isWebFile(webFile)) {
        returnFile(res, webFile);
        return;        
    }

    const isAuth = isAuthenticated(req, sessions);

    // ----------  API PUBLIC ROUTES ----------
    if (url.pathname.startsWith("/api/")) {

        // ---------- API CREDENTIALS IS CREATED ?----------
        if (url.pathname === "/api/auth/status" && req.method === "GET") {
            sendJson(res, 200, { initialized: hasCredentials() });
            return;
        }

        // ---------- API LOGOUT  ----------
        if (url.pathname === "/api/logout" && req.method === "POST") {
            
            const token = getSessionToken(req);

            if (token) sessions.remove(token);

            clearSessionCookie(res);
            sendJson(res, 200, { ok: true });
            return;

        }

    }

    // ----------  LOGIN REDIRECTION ----------
    if (!isAuth) {

        if (url.pathname.startsWith("/api/")) {
            
            // ---------- API AUTHENTICATION SETUP - INITIALIZE CREDENTIALS  ----------
            if (url.pathname === "/api/auth/initialize" && req.method === "POST") {

                try {

                    const body = await readJsonBody(req);

                    if (typeof body.password !== "string" || !body.password) {
                        sendJson(res, 400, { error: "INVALID_CREDENTIALS" });
                        return;
                    }

                    if (!initializeCredentials(body.password)) {
                        sendJson(res, 409, { error: "CREDENTIALS_ALREADY_INITIALIZED" });
                        return;
                    }

                    sendJson(res, 201, { ok: true });

                } catch (error) {

                    if (error.code === "EEXIST") {
                        sendJson(res, 409, { error: "CREDENTIALS_ALREADY_INITIALIZED" });
                        return;
                    }
                    sendJson(res, 400, { error: error.message });

                }

                return;

            }

            // ---------- API AUTHENTICATION - LOGIN  ----------
            if (url.pathname === "/api/login" && req.method === "POST") {

                try {

                    const body = await readJsonBody(req);

                    if (!isValidPassword(body.password)) {
                        sendJson(res, 401, { error: "INVALID_CREDENTIALS" });
                        return;
                    }

                    const token = sessions.create(SessionManager.SESSION_WEBADMIN);

                    if (!token) {
                        sendJson(res, 503, { error: "MAX_SESSIONS_REACHED" });
                        return;
                    }

                    setSessionCookie(res, token, config.auth.sessionTimeoutMs);

                    sendJson(res, 200, { ok: true });

                } catch (error) {
                    sendJson(res, 400, { error: error.message });
                }

                return;

            }

            // ---------- ERROR ----------
            sendJson(res, 500, { error: "Internal server error (2)" });
            return;

        }
        else {

            if (url.pathname !== "/login") {
                res.writeHead(302, { Location: "/login" });
                res.end();
                return;
            }

        }

    }

    // ---------- DEFAULT PAGE ----------
    if (url.pathname === "/" && req.method === "GET") {
        returnFile(res, "index.html");
        return;
    }

    // ---------- LOGIN PAGE ----------
    if (url.pathname === "/login" && req.method === "GET") {
        if (isAuth) {
            // redirect to /
            res.writeHead(302, { Location: "/" });
            res.end();
            return;
        }
        returnFile(res, "login.html");
        return;
    }

    // -------------------------------
    // ---- API
    // ----


//     // ---------- SENSOR API ----------
//     if (url.pathname === "/api/sensors" && req.method === "GET") {
//         sendJson(res, 200, sensors.update());
//         return;
//     }

//     // ---------- REGISTERED DEVICES API ----------
//     if (url.pathname === "/api/devices" && req.method === "GET") {
//         sendJson(res, 200, devices.getAll());
//         return;
//     }

//     if (url.pathname === "/api/pairing/requests" && req.method === "GET") {
//         sendJson(res, 200, devices.getPending());
//         return;
//     }

//     if (url.pathname === "/api/pairing/window" && req.method === "GET") {
//         sendJson(res, 200, pairingWindowStatus());
//         return;
//     }

//     if (url.pathname === "/api/pairing/window" && req.method === "POST") {
//         try {
//             const body = await readJsonBody(req);
//             if (body.enabled === true) {
//                 enablePairingWindow();
//             } else if (body.enabled === false) {
//                 disablePairingWindow();
//             } else {
//                 sendJson(res, 400, { error: "INVALID_PAIRING_WINDOW_STATE" });
//                 return;
//             }

//             sendJson(res, 200, pairingWindowStatus());
//         } catch (error) {
//             sendJson(res, 400, { error: error.message });
//         }
//         return;
//     }

//     const approveMatch = url.pathname.match(/^\/api\/devices\/([^/]+)\/approve$/);
//     if (approveMatch && req.method === "POST") {
//         if (!isPairingWindowOpen()) {
//             sendJson(res, 409, { error: "PAIRING_WINDOW_CLOSED" });
//             return;
//         }

//         const requestedMac = decodeURIComponent(approveMatch[1]);
//         const pendingDevice = devices.getPending().find(
//             device => device.mac.toLowerCase() === requestedMac.toLowerCase()
//         );
//         const mac = pendingDevice?.mac || requestedMac;
//         const pendingSocket = pendingDeviceSockets.get(mac);
//         const expectedCode = pendingPairingCodes.get(mac);
//         if (!pendingSocket || pendingSocket.readyState !== 1 || !expectedCode) {
//             sendJson(res, 409, { error: "PAIRING_REQUEST_EXPIRED" });
//             return;
//         }

//         try {
//             const body = await readJsonBody(req);
//             const providedCode = typeof body.code === "string" ? body.code.trim() : "";
//             const providedBytes = Buffer.from(providedCode);
//             const expectedBytes = Buffer.from(expectedCode);
//             if (
//                 providedBytes.length !== expectedBytes.length ||
//                 !crypto.timingSafeEqual(providedBytes, expectedBytes)
//             ) {
//                 const attempts = (pendingPairingAttempts.get(mac) || 0) + 1;
//                 pendingPairingAttempts.set(mac, attempts);
//                 if (attempts >= 5) {
//                     pendingDeviceSockets.delete(mac);
//                     pendingPairingCodes.delete(mac);
//                     pendingPairingAttempts.delete(mac);
//                     devices.rejectPending(mac);
//                     if (pendingSocket.readyState === 1) {
//                         pendingSocket.send(JSON.stringify({
//                             type: "pairing.rejected",
//                             reason: "PAIRING_CODE_ATTEMPTS_EXCEEDED"
//                         }));
//                         pendingSocket.close(4006, "Pairing code attempts exceeded");
//                     }
//                     sendJson(res, 429, { error: "PAIRING_CODE_ATTEMPTS_EXCEEDED" });
//                     return;
//                 }
//                 sendJson(res, 403, { error: "PAIRING_CODE_MISMATCH" });
//                 return;
//             }

//             if (
//                 !isPairingWindowOpen() ||
//                 pendingDeviceSockets.get(mac) !== pendingSocket ||
//                 pendingSocket.readyState !== 1 ||
//                 pendingPairingCodes.get(mac) !== expectedCode
//             ) {
//                 sendJson(res, 409, { error: "PAIRING_REQUEST_EXPIRED" });
//                 return;
//             }
//         } catch (error) {
//             sendJson(res, 400, { error: error.message });
//             return;
//         }

//         const result = devices.approve(mac);

//         if (!result) {
//             sendJson(res, 404, { error: "PAIRING_REQUEST_NOT_FOUND" });
//             return;
//         }

//         pendingDeviceSockets.delete(result.device.mac);
//         pendingPairingCodes.delete(result.device.mac);
//         pendingPairingAttempts.delete(result.device.mac);
//         pendingSocket.send(JSON.stringify({
//             type: "pairing.approved",
//             mac: result.device.mac,
//             token: result.token
//         }));

//         sendJson(res, 200, { ok: true, device: result.device });
//         return;
//     }

//     const rejectPendingMatch = url.pathname.match(/^\/api\/pairing\/requests\/([^/]+)\/reject$/);
//     if (rejectPendingMatch && req.method === "POST") {
//         const requestedMac = decodeURIComponent(rejectPendingMatch[1]);
//         const pendingDevice = devices.getPending().find(
//             device => device.mac.toLowerCase() === requestedMac.toLowerCase()
//         );
//         const mac = pendingDevice?.mac || requestedMac;
//         const socket = pendingDeviceSockets.get(mac);
//         pendingDeviceSockets.delete(mac);
//         pendingPairingCodes.delete(mac);
//         pendingPairingAttempts.delete(mac);
//         if (socket && socket.readyState === 1) {
//             socket.close(4003, "Pairing request rejected");
//         }

//         const device = devices.reject(mac);
//         if (!device) {
//             sendJson(res, 404, { error: "PAIRING_REQUEST_NOT_FOUND" });
//             return;
//         }

//         sendJson(res, 200, { ok: true });
//         return;
//     }


//     const deviceNameMatch = url.pathname.match(/^\/api\/devices\/([^/]+)$/);
//     if (deviceNameMatch && req.method === "DELETE") {
//         const requestedMac = decodeURIComponent(deviceNameMatch[1]);
//         const registeredDevice = devices.getAll().find(
//             device => device.mac.toLowerCase() === requestedMac.toLowerCase()
//         );
//         const mac = registeredDevice?.mac || requestedMac;
//         const socket = pairedDeviceSockets.get(mac);
//         pairedDeviceSockets.delete(mac);
//         if (socket && socket.readyState === 1) {
//             socket.close(4003, "Device rejected by hub");
//         }

//         const device = devices.reject(mac);

//         if (!device) {
//             sendJson(res, 404, { error: "DEVICE_NOT_FOUND" });
//             return;
//         }

//         sendJson(res, 200, { ok: true, device });
//         return;
//     }

//     if (deviceNameMatch && req.method === "PATCH") {
//         try {
//             const body = await readJsonBody(req);
//             const device = devices.setName(
//                 decodeURIComponent(deviceNameMatch[1]),
//                 body.name
//             );

//             if (device === null) {
//                 sendJson(res, 404, { error: "DEVICE_NOT_FOUND" });
//                 return;
//             }

//             if (device === false) {
//                 sendJson(res, 400, { error: "INVALID_DEVICE_NAME" });
//                 return;
//             }

//             sendJson(res, 200, device);
//         } catch (error) {
//             sendJson(res, 400, { error: error.message });
//         }

//         return;
//     }

//     // ---------- SIMULATOR STATUS ----------
//     if (url.pathname === "/api/status" && req.method === "GET") {
//         sendJson(res, 200, {
//             device: "VehicleCore Simulator",
//             sessions: sessions.getActiveSessions(),
//             scenario: sensors.scenario
//         });
//         return;
//     }

//     // ---------- SIMULATOR ONLY: CHANGE SCENARIO ----------
//     if (url.pathname === "/simulator/scenario" && req.method === "POST") {
//         try {
//             const body = await readJsonBody(req);

//             if (!sensors.setScenario(body.scenario)) {
//                 sendJson(res, 400, { error: "UNKNOWN_SCENARIO" });
//                 return;
//             }

//             sendJson(res, 200, {
//                 ok: true,
//                 scenario: sensors.scenario
//             });
//         } catch (error) {
//             sendJson(res, 400, { error: error.message });
//         }

//         return;
//     }

    res.writeHead(404);
    res.end("not found");

});

// -------------------------------------------------
// WebSocket /ws
// -------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {

    console.log("ws upgrade");

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname !== "/ws") {
        socket.destroy();
        return;
    }
    
    // For devices, connection is accepted directly 
    if (url.pathname === "/ws/device") {
        wss.handleUpgrade(req, socket, head, ws => {
            wss.emit("connection", ws, req);
        });
        return;
    }

    // For web admin, connection is accepted if authentification is done
    if (!getSessionTypeAuthenticated(req, sessions) === SessionManager.SESSION_WEBADMIN) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, ws => {
        wss.emit("connection", ws, req);
    });

});

wss.on("connection", (ws, req) => {

    console.log("WS Connection");
    console.log("Cookie: " + req.headers.cookie);

    ws._auth = { 'token': getSessionToken(req) };

     //Create webadmin devive
    if (getSessionTypeAuthenticated(req, sessions) === SessionManager.SESSION_WEBADMIN) {
        devices.registerWebAdmin(ws._auth.token);
    }

    ws.on("message", rawMessage => {

        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            ws.close(4002, "Invalid JSON message");
            return;
        }

        console.log("WS Message:" + message.type + ", data:" + message.data);

        if (!message.type) {
            ws.close(4003, "Invalid JSON message");
            return;
        }
        
        //const isAdmin = getSessionTypeAuthenticated(req, sessions) === SessionManager.SESSION_WEBADMIN;

        switch(message.type) {
            case "sensors.get":
                ws.send(JSON.stringify({ type: "sensors.list", "data": sensors.getSensors() }));
                break;
            case "sensors.read":
                devices.startListenSensors(ws._auth.token);
                break;
        }
        
    });

    ws.on("close", (code, reason) => {

        console.log("WS Close")
        if (ws._auth && ws._auth.token) devices.unregister(ws._auth.token);

    });

});

// deviceWss.on("connection", ws => {
//     const sendPairingRequest = (mac, pairingCode) => {
//         if (!isPairingWindowOpen()) {
//             ws.send(JSON.stringify({ type: "pairing.rejected", reason: "PAIRING_WINDOW_CLOSED" }));
//             ws.close(4005, "Pairing window is closed");
//             return;
//         }

//         if (typeof pairingCode !== "string" || !/^\d{8}$/.test(pairingCode)) {
//             ws.send(JSON.stringify({ type: "pairing.rejected", reason: "INVALID_PAIRING_CODE" }));
//             ws.close(4002, "Invalid pairing code");
//             return;
//         }

//         const result = devices.requestPairing(mac);
//         if (!result) {
//             ws.send(JSON.stringify({ type: "pairing.rejected", reason: "INVALID_DEVICE" }));
//             ws.close(4002, "Invalid device MAC address");
//             return;
//         }

//         const canonicalMac = result.device.mac;
//         if (result.paired) {
//             ws.send(JSON.stringify({ type: "device.authentication_failed", reason: "PAIRING_RESET_REQUIRED" }));
//             ws.close(4001, "Existing device must be explicitly revoked before pairing again");
//             return;
//         }

//         const previousPendingSocket = pendingDeviceSockets.get(canonicalMac);
//         if (previousPendingSocket && previousPendingSocket !== ws) {
//             pendingDeviceSockets.delete(canonicalMac);
//             pendingPairingCodes.delete(canonicalMac);
//             pendingPairingAttempts.delete(canonicalMac);
//             previousPendingSocket.close(4000, "A newer pairing request replaced this connection");
//         }

//         ws.deviceMac = canonicalMac;
//         pendingDeviceSockets.set(canonicalMac, ws);
//         pendingPairingCodes.set(canonicalMac, pairingCode);
//         pendingPairingAttempts.set(canonicalMac, 0);
//         ws.send(JSON.stringify({ type: "pairing.pending", mac: canonicalMac }));
//     };

//     const authenticate = (mac, token, pairingCode) => {
//         if (!devices.isTokenValid(mac, token)) {
//             if (devices.isPaired(mac)) {
//                 ws.send(JSON.stringify({
//                     type: "device.authentication_failed",
//                     reason: "PAIRING_RESET_REQUIRED"
//                 }));
//                 ws.close(4001, "Invalid token for paired device");
//                 return false;
//             }

//             sendPairingRequest(mac, pairingCode);
//             return false;
//         }

//         const canonicalMac = mac.toUpperCase();
//         const previousSocket = pairedDeviceSockets.get(canonicalMac);
//         if (previousSocket && previousSocket !== ws && previousSocket.readyState === 1) {
//             pairedDeviceSockets.delete(canonicalMac);
//             previousSocket.close(4000, "Device reconnected");
//         }

//         if (pendingDeviceSockets.get(canonicalMac) === ws) {
//             pendingDeviceSockets.delete(canonicalMac);
//         }
//         ws.deviceMac = canonicalMac;
//         pairedDeviceSockets.set(canonicalMac, ws);
//         devices.setConnected(canonicalMac, true);
//         ws.send(JSON.stringify({ type: "device.authenticated", mac: canonicalMac }));
//         ws.send(JSON.stringify({
//             type: "sensor.update",
//             data: sensors.getData()
//         }));
//         return true;
//     };

//     ws.on("message", rawMessage => {
//         let message;
//         try {
//             message = JSON.parse(rawMessage.toString());
//         } catch {
//             ws.close(4002, "Invalid JSON message");
//             return;
//         }

//         if (message.type === "device.connect") {
//             if (typeof message.mac !== "string" || !macPattern.test(message.mac)) {
//                 ws.send(JSON.stringify({ type: "pairing.rejected", reason: "INVALID_DEVICE" }));
//                 ws.close(4002, "Invalid device MAC address");
//                 return;
//             }

//             authenticate(
//                 message.mac,
//                 typeof message.token === "string" ? message.token : "",
//                 message.pairingCode
//             );
//             return;
//         }

//         if (message.type === "pairing.request") {
//             sendPairingRequest(message.mac, message.pairingCode);
//             return;
//         }

//         if (message.type === "pairing.cancel") {
//             const mac = ws.deviceMac || message.mac;
//             if (pendingDeviceSockets.get(mac) === ws) {
//                 pendingDeviceSockets.delete(mac);
//                 pendingPairingCodes.delete(mac);
//                 pendingPairingAttempts.delete(mac);
//                 devices.rejectPending(mac);
//             }
//             ws.close(1000, "Pairing request cancelled");
//             return;
//         }

//         if (message.type === "device.authenticate") {
//             authenticate(message.mac, message.token);
//             return;
//         }

//         if (message.type === "device.disconnect") {
//             ws.close(1000, "Device simulator stopped");
//         }
//     });

//     ws.on("close", () => {
//         const mac = ws.deviceMac;
//         if (!mac) {
//             return;
//         }

//         if (pendingDeviceSockets.get(mac) === ws) {
//             pendingDeviceSockets.delete(mac);
//             pendingPairingCodes.delete(mac);
//             pendingPairingAttempts.delete(mac);
//             devices.rejectPending(mac);
//         }

//         if (pairedDeviceSockets.get(mac) === ws) {
//             pairedDeviceSockets.delete(mac);
//             devices.setConnected(mac, false);
//         }
//     });
// });

// Generate dummy data sensors (arduino loop)
setInterval(() => {

    sensors.update();
    
    //console.log(JSON.stringify(Object.fromEntries(sensors.getValues())));

    for (const client of wss.clients) {
        if (client.readyState === 1) {

            if (client._auth && client._auth.token) {
                if (devices.isWebAdmin(client._auth.token)) {
                    //Now we need to check with devices object which sensors can be sent based on rate defined and last sent
                    //So we avoid to resend everything
                    client.send(JSON.stringify({ type: "sensors.value", data: Object.fromEntries(sensors.getValues()) } ));
                }
            }
   
        }
    }

//     const deviceData = JSON.stringify({ type: "sensor.update", data: sensors.getData() });
//     for (const client of pairedDeviceSockets.values()) {
//         if (client.readyState === 1) {
//             client.send(deviceData);
//         }
//     }

    //config.websocketIntervalMs

}, 500);

// -------------------------------------------------

server.listen(config.port, () => {
    console.log("");
    console.log("pmgHub Simulator");
    console.log("---------------------");
    console.log(`Web: http://localhost:${config.port}`);
    console.log(`Credentials initialized: ${hasCredentials()}`);
    console.log(`Web root: ${config.webRoot}`);
    console.log("");
});

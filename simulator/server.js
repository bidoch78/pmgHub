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
    clearSessionCookie
} = require("./auth");

const sessions = new SessionManager(
    config.auth.maxSessions,
    config.auth.sessionTimeoutMs
);

const sensors = new SensorSimulator();
const devices = new DeviceSimulator();
const pairedDeviceSockets = new Map();
const pendingDeviceSockets = new Map();
const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

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
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(data));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;

            if (body.length > 1024 * 64) {
                reject(new Error("Payload trop volumineux"));
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

function serveFile(res, relativePath) {
    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(config.webRoot, safePath);

    if (!filePath.startsWith(config.webRoot)) {
        res.writeHead(403);
        res.end("Accès interdit");
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(err.code === "ENOENT" ? 404 : 500);
            res.end(err.code === "ENOENT" ? "Fichier introuvable" : "Erreur serveur");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();

        res.writeHead(200, {
            "Content-Type": contentTypes[ext] || "application/octet-stream"
        });

        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    // ---------- API LOGIN ----------
    if (url.pathname === "/api/login" && req.method === "POST") {
        try {
            const body = await readJsonBody(req);

            if (!isValidPassword(body.password)) {
                sendJson(res, 401, { error: "INVALID_CREDENTIALS" });
                return;
            }

            const token = sessions.create();

            if (!token) {
                sendJson(res, 503, { error: "MAX_SESSIONS_REACHED" });
                return;
            }

            setSessionCookie(
                res,
                token,
                Math.floor(config.auth.sessionTimeoutMs / 1000)
            );

            sendJson(res, 200, { ok: true });
        } catch (error) {
            sendJson(res, 400, { error: error.message });
        }

        return;
    }

    // ---------- API AUTHENTICATION SETUP ----------
    if (url.pathname === "/api/auth/status" && req.method === "GET") {
        sendJson(res, 200, { initialized: hasCredentials() });
        return;
    }

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

    // ---------- API LOGOUT ----------
    if (url.pathname === "/api/logout" && req.method === "POST") {
        const token = getSessionToken(req);

        if (token) {
            sessions.remove(token);
        }

        clearSessionCookie(res);
        sendJson(res, 200, { ok: true });
        return;
    }

    // ---------- LOGIN PAGE ----------
    if (url.pathname === "/login" && req.method === "GET") {
        serveFile(res, "login.html");
        return;
    }

    // ---------- STATIC LOGIN ASSETS ----------
    if (
        url.pathname.startsWith("/css/") ||
        url.pathname.startsWith("/js/")
    ) {
        serveFile(res, url.pathname.slice(1));
        return;
    }

    // ---------- PROTECTED ROUTES ----------
    if (!isAuthenticated(req, sessions)) {
        if (url.pathname.startsWith("/api/")) {
            sendJson(res, 401, { error: "UNAUTHORIZED" });
        } else {
            res.writeHead(302, { Location: "/login" });
            res.end();
        }
        return;
    }

    // ---------- DASHBOARD ----------
    if (url.pathname === "/" && req.method === "GET") {
        serveFile(res, "index.html");
        return;
    }

    // ---------- SENSOR API ----------
    if (url.pathname === "/api/sensors" && req.method === "GET") {
        sendJson(res, 200, sensors.update());
        return;
    }

    // ---------- REGISTERED DEVICES API ----------
    if (url.pathname === "/api/devices" && req.method === "GET") {
        sendJson(res, 200, devices.getAll());
        return;
    }

    if (url.pathname === "/api/pairing/requests" && req.method === "GET") {
        sendJson(res, 200, devices.getPending());
        return;
    }

    const approveMatch = url.pathname.match(/^\/api\/devices\/([^/]+)\/approve$/);
    if (approveMatch && req.method === "POST") {
        const result = devices.approve(decodeURIComponent(approveMatch[1]));

        if (!result) {
            sendJson(res, 404, { error: "PAIRING_REQUEST_NOT_FOUND" });
            return;
        }

        const pendingSocket = pendingDeviceSockets.get(result.device.mac);
        if (pendingSocket && pendingSocket.readyState === 1) {
            pendingSocket.send(JSON.stringify({
                type: "pairing.approved",
                mac: result.device.mac,
                token: result.token
            }));
        }

        sendJson(res, 200, { ok: true, device: result.device });
        return;
    }

    const rejectPendingMatch = url.pathname.match(/^\/api\/pairing\/requests\/([^/]+)\/reject$/);
    if (rejectPendingMatch && req.method === "POST") {
        const requestedMac = decodeURIComponent(rejectPendingMatch[1]);
        const pendingDevice = devices.getPending().find(
            device => device.mac.toLowerCase() === requestedMac.toLowerCase()
        );
        const mac = pendingDevice?.mac || requestedMac;
        const socket = pendingDeviceSockets.get(mac);
        pendingDeviceSockets.delete(mac);
        if (socket && socket.readyState === 1) {
            socket.close(4003, "Pairing request rejected");
        }

        const device = devices.reject(mac);
        if (!device) {
            sendJson(res, 404, { error: "PAIRING_REQUEST_NOT_FOUND" });
            return;
        }

        sendJson(res, 200, { ok: true });
        return;
    }

    const deviceNameMatch = url.pathname.match(/^\/api\/devices\/([^/]+)$/);
    if (deviceNameMatch && req.method === "DELETE") {
        const requestedMac = decodeURIComponent(deviceNameMatch[1]);
        const registeredDevice = devices.getAll().find(
            device => device.mac.toLowerCase() === requestedMac.toLowerCase()
        );
        const mac = registeredDevice?.mac || requestedMac;
        const socket = pairedDeviceSockets.get(mac);
        pairedDeviceSockets.delete(mac);
        if (socket && socket.readyState === 1) {
            socket.close(4003, "Device rejected by hub");
        }

        const device = devices.reject(mac);

        if (!device) {
            sendJson(res, 404, { error: "DEVICE_NOT_FOUND" });
            return;
        }

        sendJson(res, 200, { ok: true, device });
        return;
    }

    if (deviceNameMatch && req.method === "PATCH") {
        try {
            const body = await readJsonBody(req);
            const device = devices.setName(
                decodeURIComponent(deviceNameMatch[1]),
                body.name
            );

            if (device === null) {
                sendJson(res, 404, { error: "DEVICE_NOT_FOUND" });
                return;
            }

            if (device === false) {
                sendJson(res, 400, { error: "INVALID_DEVICE_NAME" });
                return;
            }

            sendJson(res, 200, device);
        } catch (error) {
            sendJson(res, 400, { error: error.message });
        }

        return;
    }

    // ---------- SIMULATOR STATUS ----------
    if (url.pathname === "/api/status" && req.method === "GET") {
        sendJson(res, 200, {
            device: "VehicleCore Simulator",
            sessions: sessions.getActiveCount(),
            scenario: sensors.scenario
        });
        return;
    }

    // ---------- SIMULATOR ONLY: CHANGE SCENARIO ----------
    if (url.pathname === "/simulator/scenario" && req.method === "POST") {
        try {
            const body = await readJsonBody(req);

            if (!sensors.setScenario(body.scenario)) {
                sendJson(res, 400, { error: "UNKNOWN_SCENARIO" });
                return;
            }

            sendJson(res, 200, {
                ok: true,
                scenario: sensors.scenario
            });
        } catch (error) {
            sendJson(res, 400, { error: error.message });
        }

        return;
    }

    // ---------- ASSETS ----------
    if (url.pathname.startsWith("/assets/")) {
        serveFile(res, url.pathname.slice(1));
        return;
    }

    res.writeHead(404);
    res.end("Page introuvable");
});

// -------------------------------------------------
// WebSocket /ws
// -------------------------------------------------

const wss = new WebSocketServer({
    noServer: true
});
const deviceWss = new WebSocketServer({
    noServer: true
});

server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/ws/device") {
        deviceWss.handleUpgrade(req, socket, head, ws => {
            deviceWss.emit("connection", ws, req);
        });
        return;
    }

    if (url.pathname !== "/ws") {
        socket.destroy();
        return;
    }

    if (!isAuthenticated(req, sessions)) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, ws => {
        wss.emit("connection", ws, req);
    });
});

wss.on("connection", ws => {
    ws.send(JSON.stringify(sensors.getData()));
});

deviceWss.on("connection", ws => {
    const sendPairingRequest = (mac, replaceExisting = false) => {
        const result = devices.requestPairing(mac, "", replaceExisting);
        if (!result) {
            ws.send(JSON.stringify({ type: "pairing.rejected", reason: "INVALID_DEVICE" }));
            ws.close(4002, "Invalid device MAC address");
            return;
        }

        const canonicalMac = result.device.mac;
        const currentSocket = pairedDeviceSockets.get(canonicalMac);
        if (currentSocket && currentSocket !== ws) {
            pairedDeviceSockets.delete(canonicalMac);
            currentSocket.close(4000, "Device requires pairing approval");
        }

        const previousPendingSocket = pendingDeviceSockets.get(canonicalMac);
        if (previousPendingSocket && previousPendingSocket !== ws) {
            previousPendingSocket.close(4000, "A newer pairing request replaced this connection");
        }

        ws.deviceMac = canonicalMac;
        pendingDeviceSockets.set(canonicalMac, ws);
        ws.send(JSON.stringify({ type: "pairing.pending", mac: canonicalMac }));
    };

    const authenticate = (mac, token) => {
        if (!devices.isTokenValid(mac, token)) {
            sendPairingRequest(mac, true);
            return false;
        }

        const canonicalMac = mac.toUpperCase();
        const previousSocket = pairedDeviceSockets.get(canonicalMac);
        if (previousSocket && previousSocket !== ws && previousSocket.readyState === 1) {
            pairedDeviceSockets.delete(canonicalMac);
            previousSocket.close(4000, "Device reconnected");
        }

        if (pendingDeviceSockets.get(canonicalMac) === ws) {
            pendingDeviceSockets.delete(canonicalMac);
        }
        ws.deviceMac = canonicalMac;
        pairedDeviceSockets.set(canonicalMac, ws);
        devices.setConnected(canonicalMac, true);
        ws.send(JSON.stringify({ type: "device.authenticated", mac: canonicalMac }));
        ws.send(JSON.stringify({
            type: "sensor.update",
            data: sensors.getData()
        }));
        return true;
    };

    ws.on("message", rawMessage => {
        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            ws.close(4002, "Invalid JSON message");
            return;
        }

        if (message.type === "device.connect") {
            if (typeof message.mac !== "string" || !macPattern.test(message.mac)) {
                ws.send(JSON.stringify({ type: "pairing.rejected", reason: "INVALID_DEVICE" }));
                ws.close(4002, "Invalid device MAC address");
                return;
            }

            authenticate(message.mac, typeof message.token === "string" ? message.token : "");
            return;
        }

        if (message.type === "pairing.request") {
            sendPairingRequest(message.mac);
            return;
        }

        if (message.type === "pairing.cancel") {
            const mac = ws.deviceMac || message.mac;
            if (pendingDeviceSockets.get(mac) === ws) {
                pendingDeviceSockets.delete(mac);
                devices.rejectPending(mac);
            }
            ws.close(1000, "Pairing request cancelled");
            return;
        }

        if (message.type === "device.authenticate") {
            authenticate(message.mac, message.token);
            return;
        }

        if (message.type === "device.disconnect") {
            ws.close(1000, "Device simulator stopped");
        }
    });

    ws.on("close", () => {
        const mac = ws.deviceMac;
        if (!mac) {
            return;
        }

        if (pendingDeviceSockets.get(mac) === ws) {
            pendingDeviceSockets.delete(mac);
            devices.rejectPending(mac);
        }

        if (pairedDeviceSockets.get(mac) === ws) {
            pairedDeviceSockets.delete(mac);
            devices.setConnected(mac, false);
        }
    });
});

setInterval(() => {
    const data = JSON.stringify(sensors.update());

    for (const client of wss.clients) {
        if (client.readyState === 1) {
            client.send(data);
        }
    }

    const deviceData = JSON.stringify({ type: "sensor.update", data: sensors.getData() });
    for (const client of pairedDeviceSockets.values()) {
        if (client.readyState === 1) {
            client.send(deviceData);
        }
    }
}, config.websocketIntervalMs);

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

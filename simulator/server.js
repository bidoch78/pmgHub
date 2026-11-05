const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const config = require("./config");
const Services = require("./services");
const SessionManager = require("./sessions");

const WSClientSession = require("./ws_clientsession");

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

const services = new Services();
const csManager = services.getCSManager();

let pairingOpen = false;

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

    const webFile = url.pathname.slice(1);

    // ----------  WEB FILES (if file exists inside web folder) ----------
    if (isWebFile(webFile)) {
        returnFile(res, webFile);
        return;        
    }

    const isAuth = isAuthenticated(req, services.getSessions());

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

            if (token) services.getSessions().remove(token);

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

                    const token = services.getSessions().create(SessionManager.SESSION_WEBADMIN);

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

    res.writeHead(404);
    res.end("not found");

});

// -------------------------------------------------
// WebSocket /ws
// -------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    console.log("WSS Upgrade: " + url);

    if (csManager.countSessions() >= config.auth.maxSessions) {
        socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
        socket.destroy();        
        return;  
    }

    if (!url.pathname.startsWith("/ws")) { 
        console.log("WSS Upgrade: unknown path");
        socket.destroy(); return; 
    }

    // For devices, connection is accepted directly 
    if (url.pathname === "/ws/device") {
        console.log("WSS Upgrade: Device");
        wss.handleUpgrade(req, socket, head, ws => {
            wss.emit("connection", ws, req);
        });
        return;
    }

    // For web admin, connection is accepted if authentification is done
    if (!getSessionTypeAuthenticated(req, services.getSessions()) === SessionManager.SESSION_WEBADMIN) {
        console.log("WSS Upgrade: Unknown client");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }

    //it's a webadmin connection
    console.log("WSS Upgrade: Hello WebAdmin");
    wss.handleUpgrade(req, socket, head, ws => {
        wss.emit("connection", ws, req);
    });

});

wss.on("connection", (ws, req) => {

    console.log("WSS Connection");
    console.log("Cookie: " + req.headers.cookie);

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (csManager.countSessions() >= config.auth.maxSessions) {
        ws.close(4010, "Maximum active sessions reached");
        return;  
    }

    if (url.pathname === "/ws/admin") { 
        // WebAdmin
        if (isAuthenticated(req, services.getSessions()) && getSessionTypeAuthenticated(req, services.getSessions()) === SessionManager.SESSION_WEBADMIN) {
            const sessionToken = getSessionToken(req);
            const webAdminDevice = services.getDevices().registerWebAdmin(sessionToken, services);
            let clientMgr = new WSClientSession(webAdminDevice, ws);
            csManager.add(clientMgr);
        }
        else {
            ws.close(4001, "Unauthorized");
        }
        return;
    }

    // For devices, connection is accepted directly 
    if (url.pathname === "/ws/device") {
        // Device
        const webDevice = services.getDevices().registerDevice(services);
        let clientMgr = new WSClientSession(webDevice, ws);
        csManager.add(clientMgr);
        return;
    }

    ws.close(4000, "Unknown client");
    return;    

});

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////

// Generate dummy data sensors (arduino loop)
setInterval(() => {

    const sensors = services.getSensors();
    const devices = services.getDevices();
    const pairing = services.getPairing();
    const csMgr = services.getCSManager();

    //Check connections
    csMgr.checkHeartbeat();

    //Read sensors
    sensors.update();
    
    //Sent sensors values
    const sensorsValue = sensors.getValues();

    for(const device of devices.getDevicesAuthenticated()) {
        const dtSensor = devices.sensorsValueToSend(device, sensorsValue);
        if (dtSensor.size) csManager.sendToDevice(device.uID, JSON.stringify({ 'type': "sensors.value", data: Object.fromEntries(dtSensor) }));
    }

    //Pairing
    if (pairing.windowIsOpened()) {

        pairingOpen = true;
        const remainingTimeMs = pairing.getNextRemainingTimeMs();
        if (remainingTimeMs) {
            //console.log(remainingTimeMs);
            csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.remainingms", data: remainingTimeMs }));
        }

    }
    else {

        if (pairingOpen) {
            pairingOpen = false;
            //remove all pairing devices
            services.removeAllPairingDevices();
            csManager.broadcastToWebAdmin(JSON.stringify({ type: "pairing.remainingms", data: 0 }));
        }

        //Remove zombies
        const devicesDeleted = pairing.cleanPairingDevices();
        if (devicesDeleted) {
            for(const dUID in devicesDeleted) {
                devices.unregisterByUID(dUID);
                csManager.close(dUID);
            }
        }

    }

}, 50);

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

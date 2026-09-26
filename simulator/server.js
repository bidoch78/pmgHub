const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const config = require("./config");
const SessionManager = require("./sessions");
const SensorSimulator = require("./sensors");
const DeviceSimulator = require("./devices");
const {
    areValidCredentials,
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

            if (!areValidCredentials(body.username, body.password)) {
                sendJson(res, 401, { error: "INVALID_CREDENTIALS" });
                return;
            }

            const token = sessions.create(body.username);

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

            if (
                typeof body.username !== "string" ||
                typeof body.password !== "string" ||
                !body.username.trim() ||
                !body.password
            ) {
                sendJson(res, 400, { error: "INVALID_CREDENTIALS" });
                return;
            }

            if (!initializeCredentials(body.username.trim(), body.password)) {
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

    const deviceNameMatch = url.pathname.match(/^\/api\/devices\/([^/]+)$/);
    if (deviceNameMatch && req.method === "DELETE") {
        const device = devices.reject(decodeURIComponent(deviceNameMatch[1]));

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

server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

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

setInterval(() => {
    const data = JSON.stringify(sensors.update());

    for (const client of wss.clients) {
        if (client.readyState === 1) {
            client.send(data);
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

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { WebSocket } = require("ws");

const port = Number(process.env.PORT || 3001);
const defaultHubUrl = process.env.HUB_URL || "http://host.docker.internal:3000";
const storePath = process.env.DEVICE_STORE_PATH || path.join(__dirname, "data", "devices.json");
const webRoot = path.join(__dirname, "web");
const macPattern = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;
const sockets = new Map();
const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml"
};

function readDevices() {
    try {
        const data = JSON.parse(fs.readFileSync(storePath, "utf8"));
        return Array.isArray(data.devices) ? data.devices : [];
    } catch (error) {
        if (error.code !== "ENOENT") console.error("Unable to load device store:", error);
        return [];
    }
}

const devices = readDevices();

function saveDevices() {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.tmp`;
    const storedDevices = devices.map(({ mac, name, token, pairingRequested, hubUrl }) => ({
        mac,
        name,
        token,
        pairingRequested,
        hubUrl
    }));
    fs.writeFileSync(temporaryPath, `${JSON.stringify({ devices: storedDevices }, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporaryPath, storePath);
}

function publicDevice(device) {
    const socket = sockets.get(device.mac);
    const connected = Boolean(socket && socket.readyState === WebSocket.OPEN && device.token);
    return {
        mac: device.mac,
        name: device.name,
        paired: Boolean(device.token),
        pairingRequested: Boolean(device.pairingRequested && !device.token),
        connected
    };
}

function createMacAddress() {
    let mac;
    do {
        const bytes = crypto.randomBytes(6);
        bytes[0] = (bytes[0] | 0x02) & 0xfe;
        mac = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join(":").toUpperCase();
    } while (devices.some(device => device.mac === mac));
    return mac;
}

function findDevice(mac) {
    if (typeof mac !== "string") return undefined;
    return devices.find(device => device.mac.toLowerCase() === mac.toLowerCase());
}

function hubWebSocketUrl(hubUrl) {
    const base = new URL(hubUrl);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
        throw new Error("Hub URL must use http:// or https:// and cannot contain credentials.");
    }
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    base.pathname = "/ws/device";
    base.search = "";
    base.hash = "";
    return base.toString();
}

function scheduleReconnect(device) {
    if (!devices.includes(device) || (!device.token && !device.pairingRequested)) return;
    if (device.reconnectTimer) clearTimeout(device.reconnectTimer);
    device.reconnectTimer = setTimeout(() => connectDevice(device), 2500);
    device.reconnectTimer.unref?.();
}

function connectDevice(device) {
    if (!devices.includes(device) || !device.hubUrl) return;

    const currentSocket = sockets.get(device.mac);
    if (currentSocket && currentSocket.readyState < WebSocket.CLOSING) {
        currentSocket.removeAllListeners();
        currentSocket.close();
    }

    let socket;
    try {
        socket = new WebSocket(hubWebSocketUrl(device.hubUrl));
    } catch (error) {
        console.error(`Invalid hub URL for ${device.mac}:`, error.message);
        scheduleReconnect(device);
        return;
    }

    sockets.set(device.mac, socket);
    socket.on("open", () => {
        if (device.token) {
            socket.send(JSON.stringify({ type: "device.authenticate", mac: device.mac, token: device.token }));
        } else if (device.pairingRequested) {
            socket.send(JSON.stringify({ type: "pairing.request", mac: device.mac, name: device.name }));
        } else {
            socket.close(1000, "Pairing has not been requested");
        }
    });

    socket.on("message", rawMessage => {
        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            return;
        }

        if (message.type === "pairing.approved" && message.mac?.toLowerCase() === device.mac.toLowerCase() && typeof message.token === "string") {
            device.token = message.token;
            device.pairingRequested = false;
            saveDevices();
            windowSetTimeout(() => connectDevice(device), 150);
        } else if (message.type === "pairing.rejected") {
            device.pairingRequested = false;
            saveDevices();
        } else if (message.type === "device.authentication_failed") {
            device.token = null;
            device.pairingRequested = false;
            saveDevices();
        }
    });

    socket.on("close", code => {
        if (sockets.get(device.mac) === socket) sockets.delete(device.mac);
        if (code === 4003) {
            device.token = null;
            device.pairingRequested = false;
            saveDevices();
        }
        if (device.token || device.pairingRequested) scheduleReconnect(device);
    });

    socket.on("error", error => {
        console.warn(`Hub connection error for ${device.mac}: ${error.message}`);
    });
}

function windowSetTimeout(callback, delay) {
    const timer = setTimeout(callback, delay);
    timer.unref?.();
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += chunk;
            if (body.length > 64 * 1024) {
                reject(new Error("Request body is too large."));
                req.destroy();
            }
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error("Invalid JSON body."));
            }
        });
        req.on("error", reject);
    });
}

function serveFile(res, filename) {
    const filePath = path.join(webRoot, filename);
    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(error.code === "ENOENT" ? 404 : 500);
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const deviceMatch = url.pathname.match(/^\/api\/devices\/([^/]+)$/);
    const pairMatch = url.pathname.match(/^\/api\/devices\/([^/]+)\/pair$/);

    if (url.pathname === "/api/devices" && req.method === "GET") {
        sendJson(res, 200, devices.map(publicDevice));
        return;
    }

    if (url.pathname === "/api/config" && req.method === "GET") {
        sendJson(res, 200, { defaultHubUrl });
        return;
    }

    if (url.pathname === "/api/devices" && req.method === "POST") {
        try {
            const body = await readJsonBody(req);
            if (typeof body.name !== "string" || body.name.length > 32) {
                sendJson(res, 400, { error: "Device name must be 32 characters or fewer." });
                return;
            }
            const device = {
                mac: createMacAddress(),
                name: body.name.trim() || "pmgDevice",
                token: null,
                pairingRequested: false,
                hubUrl: defaultHubUrl
            };
            devices.push(device);
            saveDevices();
            sendJson(res, 201, publicDevice(device));
        } catch (error) {
            sendJson(res, 400, { error: error.message });
        }
        return;
    }

    if (pairMatch && req.method === "POST") {
        try {
            const device = findDevice(decodeURIComponent(pairMatch[1]));
            if (!device) {
                sendJson(res, 404, { error: "Device not found." });
                return;
            }
            const body = await readJsonBody(req);
            const hubUrl = (typeof body.hubUrl === "string" ? body.hubUrl.trim() : "") || device.hubUrl || defaultHubUrl;
            hubWebSocketUrl(hubUrl);
            device.hubUrl = hubUrl;
            device.pairingRequested = !device.token;
            saveDevices();
            connectDevice(device);
            sendJson(res, 202, publicDevice(device));
        } catch (error) {
            sendJson(res, 400, { error: error.message || "Unable to start pairing." });
        }
        return;
    }

    if (deviceMatch && req.method === "PATCH") {
        try {
            const device = findDevice(decodeURIComponent(deviceMatch[1]));
            const body = await readJsonBody(req);
            if (!device) {
                sendJson(res, 404, { error: "Device not found." });
            } else if (typeof body.name !== "string" || body.name.length > 32) {
                sendJson(res, 400, { error: "Device name must be 32 characters or fewer." });
            } else {
                device.name = body.name.trim();
                saveDevices();
                sendJson(res, 200, publicDevice(device));
            }
        } catch (error) {
            sendJson(res, 400, { error: error.message });
        }
        return;
    }

    if (deviceMatch && req.method === "DELETE") {
        const mac = decodeURIComponent(deviceMatch[1]);
        const device = findDevice(mac);
        if (!device) {
            sendJson(res, 404, { error: "Device not found." });
            return;
        }
        const socket = sockets.get(device.mac);
        sockets.delete(device.mac);
        if (device.reconnectTimer) clearTimeout(device.reconnectTimer);
        if (socket && socket.readyState === WebSocket.OPEN && !device.token) {
            socket.send(JSON.stringify({ type: "pairing.cancel", mac: device.mac }));
        }
        if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "Device deleted");
        devices.splice(devices.indexOf(device), 1);
        saveDevices();
        sendJson(res, 200, { ok: true });
        return;
    }

    if (url.pathname === "/" && req.method === "GET") {
        serveFile(res, "index.html");
        return;
    }
    if (["/app.js", "/style.css"].includes(url.pathname) && req.method === "GET") {
        serveFile(res, url.pathname.slice(1));
        return;
    }

    sendJson(res, 404, { error: "Not found." });
});

for (const device of devices) {
    if ((device.token || device.pairingRequested) && device.hubUrl) connectDevice(device);
}

server.listen(port, "0.0.0.0", () => {
    console.log(`pmgDevice Simulator listening on http://localhost:${port}`);
    console.log(`Default pmgHub URL: ${defaultHubUrl}`);
});

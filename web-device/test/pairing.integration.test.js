const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const { WebSocket } = require("ws");

const repoRoot = path.resolve(__dirname, "../..");
const hubScript = path.join(repoRoot, "simulator", "server.js");
const deviceScript = path.join(repoRoot, "web-device", "server.js");
const children = [];
let temporaryDirectory;

async function availablePort() {
    const server = net.createServer();
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    await new Promise(resolve => server.close(resolve));
    return port;
}

function start(script, env) {
    const child = spawn(process.execPath, [script], {
        cwd: repoRoot,
        env: { ...process.env, ...env },
        stdio: "ignore"
    });
    children.push(child);
    return child;
}

async function waitFor(check, description, timeoutMs = 12000) {
    const end = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < end) {
        try {
            const result = await check();
            if (result) return result;
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ""}`);
}

function waitForSocketMessage(socket, type) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out waiting for WebSocket message ${type}`)), 12000);
        const onMessage = rawMessage => {
            const message = JSON.parse(rawMessage.toString());
            if (message.type !== type) return;
            clearTimeout(timeout);
            socket.off("message", onMessage);
            resolve(message);
        };
        socket.on("message", onMessage);
        socket.once("error", error => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

after(async () => {
    for (const child of children) {
        if (child.exitCode === null) child.kill();
    }
    await Promise.all(children.map(child => child.exitCode !== null
        ? Promise.resolve()
        : new Promise(resolve => child.once("exit", resolve))));
    if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("device accepts manual identity credentials and uses token-first WebSocket pairing", { timeout: 30000 }, async () => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "pmghub-pairing-"));
    const hubPort = await availablePort();
    const devicePort = await availablePort();
    const hubUrl = `http://127.0.0.1:${hubPort}`;
    const deviceUrl = `http://127.0.0.1:${devicePort}`;
    const hubStore = path.join(temporaryDirectory, "hub-devices.json");

    start(hubScript, {
        PORT: String(hubPort),
        PMGHUB_DEVICE_STORE_PATH: hubStore,
        PMGHUB_CREDENTIALS_PATH: path.join(temporaryDirectory, "credentials.json")
    });
    start(deviceScript, {
        PORT: String(devicePort),
        BROWSER_HUB_URL: hubUrl
    });

    await waitFor(async () => {
        const [hubResponse, deviceResponse] = await Promise.all([
            fetch(`${hubUrl}/api/auth/status`),
            fetch(`${deviceUrl}/api/config`)
        ]);
        return hubResponse.ok && deviceResponse.ok;
    }, "simulator servers to start");

    const password = "pairing-test-password";
    const initializeResponse = await fetch(`${hubUrl}/api/auth/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
    });
    assert.equal(initializeResponse.status, 201);

    const loginResponse = await fetch(`${hubUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

    const exposedDeviceApi = await fetch(`${deviceUrl}/api/devices`);
    assert.equal(exposedDeviceApi.status, 404);

    const mac = "02:AA:BB:CC:DD:01";
    const manualTokenEndpoint = await fetch(`${deviceUrl}/api/devices/${encodeURIComponent(mac)}/token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "a".repeat(64) })
    });
    assert.equal(manualTokenEndpoint.status, 404);

    const socket = new WebSocket(`${hubUrl.replace(/^http/, "ws")}/ws/device`);
    await new Promise((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
    });

    const pairingPending = waitForSocketMessage(socket, "pairing.pending");
    socket.send(JSON.stringify({ type: "device.connect", mac, token: "" }));
    await pairingPending;

    const pendingRequest = await waitFor(async () => {
        const response = await fetch(`${hubUrl}/api/pairing/requests`, { headers: { Cookie: cookie } });
        const requests = await response.json();
        return requests.find(request => request.mac === mac);
    }, "the hub to list a tokenless device for approval");
    assert.equal(pendingRequest.mac, mac);
    assert.equal("token" in pendingRequest, false);

    const approvalMessage = waitForSocketMessage(socket, "pairing.approved");
    const approveResponse = await fetch(`${hubUrl}/api/devices/${encodeURIComponent(mac)}/approve`, {
        method: "POST",
        headers: { Cookie: cookie }
    });
    assert.equal(approveResponse.status, 200);
    const approval = await approvalMessage;
    assert.match(approval.token, /^[0-9a-f]{64}$/i);

    const authenticatedMessage = waitForSocketMessage(socket, "device.authenticated");
    const sensorUpdateMessage = waitForSocketMessage(socket, "sensor.update");
    socket.send(JSON.stringify({ type: "device.authenticate", mac, token: approval.token }));
    await authenticatedMessage;
    const initialSensors = await sensorUpdateMessage;
    assert.equal(typeof initialSensors.data.rpm, "number");

    const hubDevices = await fetch(`${hubUrl}/api/devices`, { headers: { Cookie: cookie } }).then(response => response.json());
    assert.equal(hubDevices.find(item => item.mac === mac)?.connected, true);
    assert.equal("token" in hubDevices.find(item => item.mac === mac), false);

    const hubStoredDevice = JSON.parse(fs.readFileSync(hubStore, "utf8")).devices.find(item => item.mac === mac);
    assert.equal(hubStoredDevice.token, approval.token);

    socket.close();
    await waitFor(async () => {
        const current = await fetch(`${hubUrl}/api/devices`, { headers: { Cookie: cookie } }).then(response => response.json());
        return current.find(item => item.mac === mac)?.connected === false;
    }, "hub to mark the device inactive after WebSocket close");

    const retrySocket = new WebSocket(`${hubUrl.replace(/^http/, "ws")}/ws/device`);
    await new Promise((resolve, reject) => {
        retrySocket.once("open", resolve);
        retrySocket.once("error", reject);
    });
    const invalidTokenPending = waitForSocketMessage(retrySocket, "pairing.pending");
    retrySocket.send(JSON.stringify({ type: "device.connect", mac, token: "invalid-token" }));
    await invalidTokenPending;

    const reapproval = await waitFor(async () => {
        const response = await fetch(`${hubUrl}/api/pairing/requests`, { headers: { Cookie: cookie } });
        const requests = await response.json();
        return requests.find(request => request.mac === mac);
    }, "the hub to send a device with an invalid token back for approval");
    assert.equal(reapproval.mac, mac);
    const previousToken = approval.token;

    const renewedTokenMessage = waitForSocketMessage(retrySocket, "pairing.approved");
    const reapproveResponse = await fetch(`${hubUrl}/api/devices/${encodeURIComponent(mac)}/approve`, {
        method: "POST",
        headers: { Cookie: cookie }
    });
    assert.equal(reapproveResponse.status, 200);
    const renewedApproval = await renewedTokenMessage;
    assert.notEqual(renewedApproval.token, previousToken);

    const reauthenticated = waitForSocketMessage(retrySocket, "device.authenticated");
    const renewedSensors = waitForSocketMessage(retrySocket, "sensor.update");
    retrySocket.send(JSON.stringify({ type: "device.authenticate", mac, token: renewedApproval.token }));
    await reauthenticated;
    await renewedSensors;
    retrySocket.close();
});

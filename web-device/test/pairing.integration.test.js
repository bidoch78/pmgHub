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

function waitForSocketMessage(socket, type, predicate = () => true) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out waiting for WebSocket message ${type}`)), 12000);
        const onMessage = rawMessage => {
            const message = JSON.parse(rawMessage.toString());
            if (message.type !== type || !predicate(message)) return;
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

test("pairing requires an active window and device code; bad tokens cannot revoke paired devices", { timeout: 30000 }, async () => {
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

    const hubWebSocketUrl = `${hubUrl.replace(/^http/, "ws")}/ws/device`;
    const closedWindowSocket = new WebSocket(hubWebSocketUrl);
    await new Promise((resolve, reject) => {
        closedWindowSocket.once("open", resolve);
        closedWindowSocket.once("error", reject);
    });

    const closedWindowMessagePromise = waitForSocketMessage(closedWindowSocket, "pairing.rejected");
    const closedWindowClosePromise = new Promise(resolve => closedWindowSocket.once("close", resolve));
    closedWindowSocket.send(JSON.stringify({
        type: "device.connect",
        mac,
        token: "",
        pairingCode: "12345678"
    }));
    const closedWindowMessage = await closedWindowMessagePromise;
    assert.equal(closedWindowMessage.reason, "PAIRING_WINDOW_CLOSED");
    await closedWindowClosePromise;

    const openWindowResponse = await fetch(`${hubUrl}/api/pairing/window`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ enabled: true })
    });
    assert.equal(openWindowResponse.status, 200);
    assert.equal((await openWindowResponse.json()).open, true);

    const socket = new WebSocket(hubWebSocketUrl);
    await new Promise((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
    });

    const pairingCode = "31415926";
    const pairingPending = waitForSocketMessage(socket, "pairing.pending");
    socket.send(JSON.stringify({ type: "device.connect", mac, token: "", pairingCode }));
    await pairingPending;

    const pendingRequest = await waitFor(async () => {
        const response = await fetch(`${hubUrl}/api/pairing/requests`, { headers: { Cookie: cookie } });
        const requests = await response.json();
        return requests.find(request => request.mac === mac);
    }, "the hub to list a tokenless device for approval");
    assert.equal(pendingRequest.mac, mac);
    assert.equal("token" in pendingRequest, false);
    assert.equal("pairingCode" in pendingRequest, false);

    const wrongCodeResponse = await fetch(`${hubUrl}/api/devices/${encodeURIComponent(mac)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ code: "87654321" })
    });
    const wrongCodeBody = await wrongCodeResponse.json();
    assert.equal(wrongCodeResponse.status, 403, JSON.stringify(wrongCodeBody));

    const approvalMessage = waitForSocketMessage(socket, "pairing.approved");
    const approveResponse = await fetch(`${hubUrl}/api/devices/${encodeURIComponent(mac)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ code: pairingCode })
    });
    assert.equal(approveResponse.status, 200);
    const approval = await approvalMessage;
    assert.match(approval.token, /^[0-9a-f]{64}$/i);

    const authenticatedMessage = waitForSocketMessage(socket, "device.authenticated");
    const sensorUpdateMessage = waitForSocketMessage(socket, "sensor.update");
    socket.send(JSON.stringify({ type: "device.authenticate", mac, token: approval.token }));
    await authenticatedMessage;
    const initialSensors = await sensorUpdateMessage;
    assert.ok(Array.isArray(initialSensors.data.sensors));
    assert.equal(new Set(initialSensors.data.sensors.map(sensor => sensor.id)).size, initialSensors.data.sensors.length);
    const rpmSensor = initialSensors.data.sensors.find(sensor => sensor.id === "engine.rpm");
    assert.equal(rpmSensor.category, "ENGINE");
    assert.equal(rpmSensor.name, "Engine speed");
    assert.equal(typeof rpmSensor.value, "number");
    assert.equal(typeof rpmSensor.voltage, "number");
    assert.equal(typeof rpmSensor.error, "boolean");
    assert.equal(typeof rpmSensor.alarm, "boolean");

    const lowOilScenario = await fetch(`${hubUrl}/simulator/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ scenario: "lowOilPressure" })
    });
    assert.equal(lowOilScenario.status, 200);
    const oilAlarm = await waitForSocketMessage(socket, "sensor.update", message =>
        message.data.sensors.some(sensor => sensor.id === "engine.oil-pressure" && sensor.alarm)
    );
    assert.ok(oilAlarm.data.sensors.find(sensor => sensor.id === "engine.oil-pressure").value < 1);

    const sensorErrorScenario = await fetch(`${hubUrl}/simulator/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ scenario: "sensorError" })
    });
    assert.equal(sensorErrorScenario.status, 200);
    const sensorError = await waitForSocketMessage(socket, "sensor.update", message =>
        message.data.sensors.some(sensor => sensor.id === "fuel.pressure" && sensor.error)
    );
    assert.equal(sensorError.data.sensors.find(sensor => sensor.id === "fuel.pressure").error, true);

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

    const retrySocket = new WebSocket(hubWebSocketUrl);
    await new Promise((resolve, reject) => {
        retrySocket.once("open", resolve);
        retrySocket.once("error", reject);
    });
    const authFailedPromise = waitForSocketMessage(retrySocket, "device.authentication_failed");
    const attackerClosePromise = new Promise(resolve => retrySocket.once("close", resolve));
    retrySocket.send(JSON.stringify({ type: "device.connect", mac, token: "invalid-token", pairingCode: "99999999" }));
    const authFailed = await authFailedPromise;
    assert.equal(authFailed.reason, "PAIRING_RESET_REQUIRED");
    await attackerClosePromise;

    const pendingAfterSpoof = await fetch(`${hubUrl}/api/pairing/requests`, { headers: { Cookie: cookie } }).then(response => response.json());
    assert.equal(pendingAfterSpoof.some(request => request.mac === mac), false);
    const pairedAfterSpoof = await fetch(`${hubUrl}/api/devices`, { headers: { Cookie: cookie } }).then(response => response.json());
    assert.equal(pairedAfterSpoof.find(item => item.mac === mac)?.paired, true);
    assert.equal(JSON.parse(fs.readFileSync(hubStore, "utf8")).devices.find(item => item.mac === mac).token, approval.token);

    const legitimateReconnect = new WebSocket(hubWebSocketUrl);
    await new Promise((resolve, reject) => {
        legitimateReconnect.once("open", resolve);
        legitimateReconnect.once("error", reject);
    });
    const reauthenticated = waitForSocketMessage(legitimateReconnect, "device.authenticated");
    legitimateReconnect.send(JSON.stringify({ type: "device.connect", mac, token: approval.token }));
    await reauthenticated;
    legitimateReconnect.close();
});

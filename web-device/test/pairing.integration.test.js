const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

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

after(async () => {
    for (const child of children) {
        if (child.exitCode === null) child.kill();
    }
    await Promise.all(children.map(child => child.exitCode !== null
        ? Promise.resolve()
        : new Promise(resolve => child.once("exit", resolve))));
    if (temporaryDirectory) {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
});

test("device simulator pairs with the hub and persists the shared token", { timeout: 30000 }, async () => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "pmghub-pairing-"));
    const hubPort = await availablePort();
    const devicePort = await availablePort();
    const hubUrl = `http://127.0.0.1:${hubPort}`;
    const deviceUrl = `http://127.0.0.1:${devicePort}`;
    const hubStore = path.join(temporaryDirectory, "hub-devices.json");
    const deviceStore = path.join(temporaryDirectory, "device-devices.json");

    start(hubScript, {
        PORT: String(hubPort),
        PMGHUB_DEVICE_STORE_PATH: hubStore
    });
    start(deviceScript, {
        PORT: String(devicePort),
        HUB_URL: hubUrl,
        DEVICE_STORE_PATH: deviceStore
    });

    await waitFor(async () => {
        const [hubResponse, deviceResponse] = await Promise.all([
            fetch(`${hubUrl}/api/auth/status`),
            fetch(`${deviceUrl}/api/config`)
        ]);
        return hubResponse.ok && deviceResponse.ok;
    }, "simulator servers to start");

    const authStatus = await fetch(`${hubUrl}/api/auth/status`).then(response => response.json());
    let credentials;
    const credentialPath = path.join(repoRoot, "simulator", "credentials.json");
    if (authStatus.initialized && fs.existsSync(credentialPath)) {
        credentials = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
    } else {
        credentials = { username: "pairing-test", password: "pairing-test-password" };
        const response = await fetch(`${hubUrl}/api/auth/initialize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });
        assert.equal(response.status, 201);
    }

    const loginResponse = await fetch(`${hubUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

    const createResponse = await fetch(`${deviceUrl}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Integration display" })
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.match(created.mac, /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/);
    assert.equal(created.paired, false);

    const pairResponse = await fetch(`${deviceUrl}/api/devices/${encodeURIComponent(created.mac)}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubUrl })
    });
    assert.equal(pairResponse.status, 202);

    const requestsUrl = `${hubUrl}/api/pairing/requests`;
    await waitFor(async () => {
        const response = await fetch(requestsUrl, { headers: { Cookie: cookie } });
        const requests = await response.json();
        return requests.find(request => request.mac === created.mac);
    }, "the hub to receive the pairing request");

    const approveResponse = await fetch(`${hubUrl}/api/devices/${encodeURIComponent(created.mac)}/approve`, {
        method: "POST",
        headers: { Cookie: cookie }
    });
    assert.equal(approveResponse.status, 200);

    const pairedDevice = await waitFor(async () => {
        const response = await fetch(`${deviceUrl}/api/devices`);
        const currentDevices = await response.json();
        return currentDevices.find(device => device.mac === created.mac && device.paired && device.connected);
    }, "the device to reconnect with its token");
    assert.equal("token" in pairedDevice, false);

    const hubDevices = await fetch(`${hubUrl}/api/devices`, { headers: { Cookie: cookie } }).then(response => response.json());
    const hubDevice = hubDevices.find(device => device.mac === created.mac);
    assert.equal(hubDevice.connected, true);
    assert.equal("token" in hubDevice, false);

    const hubStoredDevice = JSON.parse(fs.readFileSync(hubStore, "utf8")).devices.find(device => device.mac === created.mac);
    const deviceStoredDevice = JSON.parse(fs.readFileSync(deviceStore, "utf8")).devices.find(device => device.mac === created.mac);
    assert.equal(typeof hubStoredDevice.token, "string");
    assert.equal(deviceStoredDevice.token, hubStoredDevice.token);
});

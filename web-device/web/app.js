const deviceList = document.getElementById("deviceList");
const deviceCount = document.getElementById("deviceCount");
const appMessage = document.getElementById("appMessage");
const hubUrlInput = document.getElementById("hubUrl");
const manualMacInput = document.getElementById("manualMac");
const manualTokenInput = document.getElementById("manualToken");
const createDeviceControls = document.getElementById("createDeviceControls");
const deviceTemplate = document.getElementById("deviceTemplate");
const sensorPanel = document.getElementById("sensorPanel");
const sensorData = document.getElementById("sensorData");

let device = null;
let deviceCard = null;
let deviceSocket = null;
let connectionState = "disconnected";
let pairingRequested = false;
let disconnecting = false;

// Remove values saved by previous versions; this simulator now keeps state in memory only.
localStorage.removeItem("pmghub-url");
localStorage.removeItem("pmgdevice-mac");
localStorage.removeItem("pmgdevice-token");

async function getHubConfig() {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("Unable to load hub configuration.");
    return response.json();
}

function setMessage(message = "") {
    appMessage.textContent = message;
}

function createMacAddress() {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    bytes[0] = (bytes[0] | 0x02) & 0xfe;
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join(":").toUpperCase();
}

function setConnectionState(state, label) {
    connectionState = state;
    if (!deviceCard) return;

    const status = deviceCard.querySelector(".device-status");
    status.classList.toggle("connected", state === "connected");
    status.classList.toggle("waiting", state === "waiting");
    status.classList.toggle("disconnected", ["disconnected", "error"].includes(state));
    status.querySelector(".status-label").textContent = label || {
        connected: "Connected",
        waiting: "Waiting for approval",
        connecting: "Connecting",
        disconnected: "Inactive",
        error: "Connection error"
    }[state];
    deviceCount.textContent = state === "connected" ? "1 device · Connected" : "1 device · Inactive";

    const pairButton = deviceCard.querySelector(".pair-button");
    const connectionButton = deviceCard.querySelector(".connection-button");
    pairButton.hidden = Boolean(device.token);
    pairButton.disabled = state === "connecting" || state === "waiting";
    pairButton.textContent = state === "waiting" ? "Request sent" : "Pair with hub";
    connectionButton.hidden = !device.token || state === "connected";
    connectionButton.textContent = "Reconnect";
    connectionButton.classList.add("reconnect-button");
    connectionButton.disabled = state === "connecting" || state === "waiting";
}

function renderDevice(currentDevice) {
    device = currentDevice;
    createDeviceControls.hidden = Boolean(device);
    deviceList.replaceChildren();
    sensorPanel.hidden = true;

    if (!device) {
        deviceCard = null;
        deviceCount.textContent = "No device created";
        return;
    }

    deviceCard = deviceTemplate.content.firstElementChild.cloneNode(true);
    const macInput = deviceCard.querySelector(".mac-input");
    const tokenInput = deviceCard.querySelector(".token-input");
    macInput.value = device.mac;
    macInput.setAttribute("aria-label", `MAC address for device ${device.mac}`);
    tokenInput.value = device.token || "";
    tokenInput.setAttribute("aria-label", `Pairing token for device ${device.mac}`);
    deviceCard.querySelector(".pair-state").textContent = device.token
        ? "Token stored locally · ready to authenticate"
        : "No pairing token · request hub approval";

    deviceCard.querySelector(".pair-button").addEventListener("click", () => {
        setMessage("");
        connectDevice();
    });
    deviceCard.querySelector(".connection-button").addEventListener("click", connectDevice);
    deviceList.append(deviceCard);
    setConnectionState("disconnected");
}

function createHubWebSocketUrl() {
    const hubUrl = new URL(hubUrlInput.value.trim() || device.hubUrl || "http://localhost:3000");
    if (!["http:", "https:"].includes(hubUrl.protocol) || hubUrl.username || hubUrl.password) {
        throw new Error("Hub URL must use http:// or https:// and cannot contain credentials.");
    }
    hubUrl.protocol = hubUrl.protocol === "https:" ? "wss:" : "ws:";
    hubUrl.pathname = "/ws/device";
    hubUrl.search = "";
    hubUrl.hash = "";
    return hubUrl.toString();
}

function connectDevice() {
    if (!device || (deviceSocket && deviceSocket.readyState < WebSocket.CLOSING)) return;

    let socketUrl;
    try {
        socketUrl = createHubWebSocketUrl();
    } catch (error) {
        setConnectionState("error", "Invalid hub URL");
        setMessage(error.message);
        return;
    }

    pairingRequested = !device.token;
    disconnecting = false;
    setConnectionState("connecting");

    const socket = new WebSocket(socketUrl);
    deviceSocket = socket;
    socket.addEventListener("open", () => {
        socket.send(JSON.stringify({
            type: "device.connect",
            mac: device.mac,
            token: device.token || ""
        }));
    });

    socket.addEventListener("message", event => {
        let message;
        try {
            message = JSON.parse(event.data);
        } catch {
            return;
        }

        if (message.type === "pairing.pending") {
            pairingRequested = true;
            device.token = "";
            deviceCard.querySelector(".token-input").value = "";
            deviceCard.querySelector(".pair-state").textContent = "No valid token · awaiting hub approval";
            setConnectionState("waiting");
            setMessage("Pairing request sent. Approve this device in the pmgHub dashboard.");
            return;
        }

        if (message.type === "pairing.approved" && message.mac?.toLowerCase() === device.mac.toLowerCase() && typeof message.token === "string") {
            device.token = message.token;
            deviceCard.querySelector(".token-input").value = device.token;
            deviceCard.querySelector(".pair-state").textContent = "Token stored locally · authenticating";
            pairingRequested = false;
            socket.send(JSON.stringify({ type: "device.authenticate", mac: device.mac, token: device.token }));
            setConnectionState("connecting", "Authenticating");
            return;
        }

        if (message.type === "pairing.rejected") {
            pairingRequested = false;
            setConnectionState("error", "Pairing rejected");
            return;
        }

        if (message.type === "device.authenticated") {
            setConnectionState("connected");
            deviceCard.querySelector(".pair-state").textContent = "Token stored locally · authenticated";
            sensorPanel.hidden = false;
            setMessage("Device connected to pmgHub.");
            return;
        }

        if (message.type === "device.authentication_failed") {
            device.token = "";
            deviceCard.querySelector(".token-input").value = "";
            deviceCard.querySelector(".pair-state").textContent = "Token rejected · awaiting hub approval";
            setConnectionState("waiting");
            setMessage("Saved token was invalid. The device is waiting for approval in the hub dashboard.");
            return;
        }

        if (message.type === "sensor.update") {
            sensorPanel.hidden = false;
            sensorData.textContent = JSON.stringify(message.data, null, 2);
        }
    });

    socket.addEventListener("error", () => {
        if (deviceSocket === socket) {
            setConnectionState("error");
            setMessage("Unable to connect to the hub WebSocket.");
        }
    });

    socket.addEventListener("close", event => {
        if (deviceSocket !== socket) return;
        deviceSocket = null;
        pairingRequested = false;
        setConnectionState("disconnected");
        sensorPanel.hidden = true;

        if (event.code === 4003 && device.token) {
            device.token = "";
            deviceCard.querySelector(".token-input").value = "";
            deviceCard.querySelector(".pair-state").textContent = "Token revoked · reconnect to request approval";
        }

        if (!disconnecting && event.code !== 1000 && !event.reason) {
            setMessage("WebSocket disconnected. Select Reconnect to try again.");
        }
        disconnecting = false;
    });
}

async function initialize() {
    try {
        const config = await getHubConfig();
        hubUrlInput.value = config.defaultHubUrl;
        renderDevice(null);
    } catch (error) {
        deviceCount.textContent = "Unable to load device simulator";
        setMessage(error.message);
    }
}

function getHubConfig() {
    return fetch("/api/config").then(response => {
        if (!response.ok) throw new Error("Unable to load hub configuration.");
        return response.json();
    });
}

document.getElementById("createDeviceButton").addEventListener("click", () => {
    const enteredMac = manualMacInput.value.trim().toUpperCase();
    const enteredToken = manualTokenInput.value.trim();
    if (enteredMac && !/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(enteredMac)) {
        setMessage("MAC address must use the format XX:XX:XX:XX:XX:XX.");
        return;
    }
    if (enteredToken && !/^[0-9A-F]{64}$/i.test(enteredToken)) {
        setMessage("Pairing token must contain exactly 64 hexadecimal characters, or be left empty.");
        return;
    }

    const mac = enteredMac || createMacAddress();
    device = { mac, token: enteredToken, hubUrl: hubUrlInput.value.trim() || "http://localhost:3000" };
    manualMacInput.value = "";
    manualTokenInput.value = "";
    renderDevice(device);
    setMessage(enteredToken
        ? "Device created with the supplied token. Connecting to pmgHub to authenticate."
        : "Device created without a token. Connecting to pmgHub to request pairing.");
    connectDevice();
});

window.addEventListener("pagehide", () => {
    if (deviceSocket && deviceSocket.readyState < WebSocket.CLOSING) {
        disconnecting = true;
        if (!device.token && pairingRequested && deviceSocket.readyState === WebSocket.OPEN) {
            deviceSocket.send(JSON.stringify({ type: "pairing.cancel", mac: device.mac }));
        }
        deviceSocket.close(1000, "Device simulator page closed");
    }
});

initialize();

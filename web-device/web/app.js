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
const receivedSensorCards = new Map();
const receivedSensorGroups = new Map();

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

function displaySensorData(data) {
    if (!data || !Array.isArray(data.sensors)) return;

    const receivedIds = new Set();
    for (const sensor of data.sensors) {
        if (!sensor || typeof sensor.id !== "string" || !sensor.id) continue;
        if (sensor.id === "engine.rpm") {
            displayRpmSensor(sensor);
        }
        receivedIds.add(sensor.id);
        const category = typeof sensor.category === "string" && sensor.category.trim()
            ? sensor.category.trim().toUpperCase()
            : "UNCATEGORIZED";
        let group = receivedSensorGroups.get(category);
        if (!group) {
            const section = document.createElement("section");
            section.className = "device-sensor-category";
            const title = document.createElement("h3");
            title.textContent = category;
            const list = document.createElement("div");
            list.className = "device-sensor-grid";
            section.append(title, list);
            sensorData.append(section);
            group = { section, list };
            receivedSensorGroups.set(category, group);
        }

        let card = receivedSensorCards.get(sensor.id);
        if (!card) {
            card = document.createElement("article");
            card.className = "device-sensor-card";
            card.dataset.sensorId = sensor.id;
            const heading = document.createElement("div");
            heading.className = "device-sensor-heading";
            const name = document.createElement("strong");
            name.className = "device-sensor-name";
            const flags = document.createElement("div");
            flags.className = "sensor-flags";
            const error = document.createElement("span");
            error.className = "sensor-flag sensor-error";
            error.textContent = "Read error";
            const alarm = document.createElement("span");
            alarm.className = "sensor-flag sensor-alarm";
            alarm.textContent = "Alarm";
            flags.append(error, alarm);
            heading.append(name, flags);
            const id = document.createElement("small");
            id.className = "device-sensor-id";
            const value = document.createElement("strong");
            value.className = "device-sensor-value";
            const voltage = document.createElement("small");
            voltage.className = "device-sensor-voltage";
            card.append(heading, id, value, voltage);
            receivedSensorCards.set(sensor.id, card);
        }

        const setText = (selector, text) => {
            const target = card.querySelector(selector);
            if (target.textContent !== text) target.textContent = text;
        };
        setText(".device-sensor-name", sensor.name || sensor.id);
        setText(".device-sensor-id", sensor.id);
        setText(".device-sensor-value", typeof sensor.value === "number" && Number.isFinite(sensor.value)
            ? `${sensor.value} ${sensor.unit || ""}`.trim()
            : "--");
        setText(".device-sensor-voltage", typeof sensor.voltage === "number" && Number.isFinite(sensor.voltage)
            ? `${sensor.voltage.toFixed(3)} V`
            : "Voltage unavailable");
        const hasError = sensor.error === true;
        const hasAlarm = sensor.alarm === true;
        card.classList.toggle("has-error", hasError);
        card.classList.toggle("has-alarm", hasAlarm);
        card.querySelector(".sensor-error").hidden = !hasError;
        card.querySelector(".sensor-alarm").hidden = !hasAlarm;
        if (card.parentElement !== group.list) group.list.append(card);
    }

    for (const [id, card] of receivedSensorCards) {
        if (!receivedIds.has(id)) {
            card.remove();
            receivedSensorCards.delete(id);
        }
    }

    for (const group of receivedSensorGroups.values()) {
        group.section.hidden = group.list.childElementCount === 0;
    }
}

function displayRpmSensor(sensor) {
    if (!deviceCard) return;
    const reading = deviceCard.querySelector(".device-live-reading");
    const valueElement = reading.querySelector(".rpm-value");
    const value = typeof sensor.value === "number" && Number.isFinite(sensor.value)
        ? String(sensor.value)
        : "--";
    const unit = typeof sensor.unit === "string" && sensor.unit ? sensor.unit : "rpm";
    const voltage = typeof sensor.voltage === "number" && Number.isFinite(sensor.voltage)
        ? `${sensor.voltage.toFixed(3)} V`
        : "--";

    if (valueElement.textContent !== value) valueElement.textContent = value;
    const unitElement = reading.querySelector(".rpm-unit");
    if (unitElement.textContent !== unit) unitElement.textContent = unit;
    const voltageElement = reading.querySelector(".rpm-voltage");
    if (voltageElement.textContent !== voltage) voltageElement.textContent = voltage;

    const hasError = sensor.error === true;
    const hasAlarm = sensor.alarm === true;
    reading.classList.toggle("has-error", hasError);
    reading.classList.toggle("has-alarm", hasAlarm);
    reading.querySelector(".sensor-error").hidden = !hasError;
    reading.querySelector(".sensor-alarm").hidden = !hasAlarm;
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
    deviceCard.querySelector(".device-live-reading").classList.toggle("is-inactive", true);

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
            deviceCard.querySelector(".device-live-reading").classList.remove("is-inactive");
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
            deviceCard.querySelector(".device-live-reading").classList.remove("is-inactive");
            displaySensorData(message.data);
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
        deviceCard.querySelector(".device-live-reading").classList.add("is-inactive");

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

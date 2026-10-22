const deviceList = document.getElementById("deviceList");
const deviceCount = document.getElementById("deviceCount");
const appMessage = document.getElementById("appMessage");
const hubUrlInput = document.getElementById("hubUrl");
const manualMacInput = document.getElementById("manualMac");
const manualTokenInput = document.getElementById("manualToken");
// const createDeviceControls = document.getElementById("createDeviceControls");
const deviceTemplate = document.getElementById("deviceTemplate");
// const sensorPanel = document.getElementById("sensorPanel");
// const sensorData = document.getElementById("sensorData");

// let device = null;
// let deviceCard = null;
// let deviceSocket = null;
// let connectionState = "disconnected";
// let pairingRequested = false;
// let disconnecting = false;
// const receivedSensorCards = new Map();
// const receivedSensorGroups = new Map();

const deviceData = new Map();

function setMessage(message = "") {
    appMessage.textContent = message;
}

function createMacAddress() {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    bytes[0] = (bytes[0] | 0x02) & 0xfe;
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join(":").toUpperCase();
}

function generateHexToken(length = 32) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function createPairingCode() {
    const bytes = crypto.getRandomValues(new Uint32Array(1));
    return String(bytes[0] % 100_000_000).padStart(8, "0");
}

function displaySensor(device, data) {

    const deviceCard = device.getCard();
    const sensor = data["engine.coolant-temp"] ?? null;

    const reading = deviceCard.querySelector(".device-live-reading");
    const valueElement = reading.querySelector(".sensor-value");

    const value = typeof sensor.value === "number" && Number.isFinite(sensor.value)
        ? String(sensor.value)  
        : "--";
    //const unit = typeof sensor.unit === "string" && sensor.unit ? sensor.unit : "rpm";
    const voltage = typeof sensor.voltage === "number" && Number.isFinite(sensor.voltage)
        ? `${sensor.voltage.toFixed(3)} V`
        : "--";

    if (valueElement.textContent !== value) valueElement.textContent = value;
    const voltageElement = reading.querySelector(".sensor-voltage");
    if (voltageElement.textContent !== voltage) voltageElement.textContent = voltage;

//     const unitElement = reading.querySelector(".rpm-unit");
//     if (unitElement.textContent !== unit) unitElement.textContent = unit;

//     const hasError = sensor.error === true;
//     const hasAlarm = sensor.alarm === true;
//     reading.classList.toggle("has-error", hasError);
//     reading.classList.toggle("has-alarm", hasAlarm);
//     reading.querySelector(".sensor-error").hidden = !hasError;
//     reading.querySelector(".sensor-alarm").hidden = !hasAlarm;
}

function setConnectionState(device, state, label) {

    if (!device) return;

    const deviceCard = device.getCard();

    if (!deviceCard) return;
    
    const status = deviceCard.querySelector(".device-status");
    status.classList.toggle("connected", state === "connected");
    status.classList.toggle("waiting", state === "waiting");
    status.classList.toggle("disconnected", ["disconnected", "error", "reject"].includes(state));
    status.querySelector(".status-label").textContent = label || {
        connected: "Connected",
        waiting: "Waiting for approval",
        connecting: "Connecting",
        disconnected: "Inactive",
        error: "Connection error",
        reject: "Pairing has been rejected"
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

function renderDevice(device) {

    const deviceCard = deviceTemplate.content.firstElementChild.cloneNode(true);

    deviceCard.setAttribute("id", device.getMacId());

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
        connectDevice(device);
    });

    deviceCard.querySelector(".connection-button").addEventListener("click", () => {
        connectDevice(device);
    });

    deviceList.append(deviceCard);
    setConnectionState(device, "disconnected");

}

function updatePairingCodeDisplay(device) {
    if (!device) return;
    const pairingCode = device.getCard().querySelector(".device-pairing-code");
    pairingCode.hidden = Boolean(device.token);
    pairingCode.querySelector(".pairing-code-value").textContent = device.pairingCode || "--------";
}

function createHubWebSocketUrl() {
    return hubUrlInput.value;
}

function generateNonce() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signNonce(token, nonce) {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(token),
        {
            name: "HMAC",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(nonce)
    );

    return [...new Uint8Array(signature)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function connectDevice(device) {

    if (!device) return;

    let data = null;

    if (!deviceData.has(device.mac)) {
        
        //Initialize websocket
        data = {
            device: device,
            socket: null,
            disconnecting: false
        }

        deviceData.set(device.mac, data);
    
    }
    else {
        data = deviceData.get(device.mac);
    }

    if (data.socket && data.socket.readyState < WebSocket.CLOSING) return;

    if (!data.device.token) {
        updatePairingCodeDisplay(data.device);
    }

    data.disconnecting = false;
    setConnectionState(data.device, "connecting");

    data.socket = new WebSocket(createHubWebSocketUrl() + '/ws/device');

    const dataAuth = {
        mac: device.mac
    };

    if (device.token) {
        dataAuth.nonce = this.generateNonce();
        const signature = await signNonce(device.token, dataAuth.nonce);
        dataAuth.signature = signature;
    }
    else {
        device.token = "";
        dataAuth.pairingCode = device.pairingCode;
    }

    data.socket.addEventListener("open", () => {
        data.socket.send(JSON.stringify({
            type: "device.connect",
            data: dataAuth
        }));
    });

    data.socket.addEventListener("message", event => {

        let message;
        try {
            message = JSON.parse(event.data);
        } catch {
            return;
        }

        if (message.type === "pairing.pending") {
            const deviceCard = data.device.getCard();
            deviceCard.querySelector(".token-input").value = "";
            deviceCard.querySelector(".pair-state").textContent = "No valid token - awaiting hub approval";
            setConnectionState(data.device, "waiting");
            setMessage("Pairing request sent. Approve this device in the pmgHub dashboard.");
            return;
        }

        if (message.type === "pairing.rejected") {
            const reason = message.data === "PAIRING_WINDOW_CLOSED"
                ? "Open the hub pairing window, then retry."
                : "Pairing was rejected by the hub.";
            setConnectionState(data.device, "error", "Pairing unavailable");
            setMessage(reason);
            return;
        }

        if (message.type === "device.authenticated") {
            setConnectionState(data.device, "connected");
            data.device.token = message.data.token;
            const deviceCard = data.device.getCard();
            deviceCard.querySelector(".pair-state").textContent = "Token stored locally · authenticated";
            deviceCard.querySelector(".device-live-reading").classList.remove("is-inactive");
            deviceCard.querySelector(".token-input").value = data.device.token;
//             sensorPanel.hidden = false;
            setMessage("Device connected to pmgHub.");
            data.socket.send(JSON.stringify({ type: "sensors.read", data: [ "engine.coolant-temp" ] }));
            return;
        }

        if (message.type === "sensors.value") {
//             sensorPanel.hidden = false;
            displaySensor(data.device, message.data);
        }

    });

    data.socket.addEventListener("error", () => {
        setConnectionState(data.device, "error");
        setMessage("Unable to connect to the hub WebSocket.");
    });

    data.socket.addEventListener("close", event => {

        if (event.code === 4200) {
            setConnectionState(data.device, "reject");
        }
        else {
            setConnectionState(data.device, "error");
        }

    });

}

document.querySelectorAll(".prefillmactoken").forEach(button => {
    button.addEventListener("click", () => {
        const value = button.dataset.prefill;
        let genMAC = "";
        let genTOKEN = "";
        switch(value) {
            case "1":
                genMAC = "8a:14:a3:39:4d:2e";
                genTOKEN = "b0f2bc721c445f8683cfe15eb55f3018c860c6a7f7b91c0d1ac018126ca3ef60";
                break;
            case "2":
                genMAC = "9b:1d:96:3b:99:c4";
                genTOKEN = "16ea1791a8bb8aeaf4fc781ca02be30938316bc345b39045a53745531733c3e1";                
                break;
            case "3":
                genMAC = "e2:0a:89:b9:3f:70";
                genTOKEN = "25bab96fb0aa2199604feb2564858b58e8994dfeba878d32f01df7d56d7e01e7";
                break;
            case "X":
                genMAC = createMacAddress();
                genTOKEN = generateHexToken();
                break;
        }
        manualMacInput.value = genMAC;
        manualTokenInput.value = genTOKEN;
    });
});

document.getElementById("createDeviceNoActionButton").addEventListener("click", () => {

    //We connect to and do nothing
    const socket = new WebSocket(createHubWebSocketUrl() + '/ws/device');

    socket.onmessage = (event) => {
        console.log('NoAction - Received msg:', event.data);
    };

    socket.onerror = (error) => {
        console.error('NoAction - Error WS:', error);
    };

    socket.onclose = (event) => {
        console.log(`NoAction - Socket closed (code=${event.code}, reason=${event.reason})`);
    };

});

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
    const device = {
        mac: mac,
        token: enteredToken,
        pairingCode: enteredToken ? "" : createPairingCode(),
        getMacId: function() { return `mac${this.mac.replaceAll(':', '_')}` },
        getCard: function() { return deviceList.querySelector(`#mac${this.mac.replaceAll(':', '_')}`); }
    };

    manualMacInput.value = "";
    manualTokenInput.value = "";
    renderDevice(device);
    setMessage(enteredToken
         ? "Device created with the supplied token. Connecting to pmgHub to authenticate."
         : "Device created without a token. Connecting to pmgHub to request pairing.");
    //connectDevice();

});

window.addEventListener("pagehide", () => {
//     if (deviceSocket && deviceSocket.readyState < WebSocket.CLOSING) {
//         disconnecting = true;
//         if (!device.token && pairingRequested && deviceSocket.readyState === WebSocket.OPEN) {
//             deviceSocket.send(JSON.stringify({ type: "pairing.cancel", mac: device.mac }));
//         }
//         deviceSocket.close(1000, "Device simulator page closed");
//     }
});

hubUrlInput.value = "http://localhost:3000";
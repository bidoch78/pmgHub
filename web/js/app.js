import {
        getAuthStatus,
        logout,
        sendWSCommand
} from "./api.js";

const connectionStatus = document.getElementById("connectionStatus");
const sensorGroups = document.getElementById("sensorGroups");
const deviceList = document.getElementById("deviceList");
const deviceCount = document.getElementById("deviceCount");
const pairingList = document.getElementById("pairingList");
const pairingCount = document.getElementById("pairingCount");
const pairingWindowStatus = document.getElementById("pairingWindowStatus");
const pairingWindowButton = document.getElementById("pairingWindowButton");

let wsCom = null;

const sensorCards = new Map();
const sensorCategoryGroups = new Map();

function displaySensors(data, read = false) {

    if (!data || !Array.isArray(data)) return;

    const receivedIds = new Set();
    const activeCategories = new Set();

    for (const sensordata of data) {

        const sensor = sensordata.sensor;

        if (!sensor || typeof sensor.id !== "string" || !sensor.id) continue;

        receivedIds.add(sensor.id);
        const category = typeof sensor.category === "string" && sensor.category.trim()
            ? sensor.category.trim().toUpperCase()
            : "UNCATEGORIZED";
        activeCategories.add(category);

        let group = sensorCategoryGroups.get(category);
        if (!group) {
            group = createSensorCategory(category);
            sensorCategoryGroups.set(category, group);
            sensorGroups.append(group.element);
        }

        let card = sensorCards.get(sensor.id);
        if (!card) {
            card = createSensorCard(sensor.id);
            sensorCards.set(sensor.id, card);
        }
        updateSensorCard(card, sensor, sensordata.unit);

        if (card.element.parentElement !== group.grid) {
            group.grid.append(card.element);
        }

    }

    for (const [category, group] of sensorCategoryGroups) {
        group.element.hidden = !activeCategories.has(category) || group.grid.childElementCount === 0;
    }

    sensorGroups.querySelector(".empty-state")?.remove();
    if (receivedIds.size === 0 && !sensorGroups.querySelector(".empty-state")) {
        const emptyState = document.createElement("p");
        emptyState.className = "empty-state";
        emptyState.textContent = "No sensors are configured on this hub.";
        sensorGroups.append(emptyState);
    }

    if (read) sendWSCommand(wsCom, "sensors.read", "start");

}

function createSensorCategory(category) {

    const section = document.createElement("section");
    section.className = "sensor-category";

    const heading = document.createElement("h3");
    heading.className = "sensor-category-title";
    heading.textContent = category;

    const grid = document.createElement("div");
    grid.className = "dashboard";
    
    section.append(heading, grid);

    return { element: section, grid };

}

function createSensorCard(id) {

    const element = document.createElement("article");
    element.className = "card sensor-card";
    element.dataset.sensorId = id;

    const name = document.createElement("span");
    name.className = "sensor-name";

    const sensorId = document.createElement("small");
    sensorId.className = "sensor-id";

    const sensorRate = document.createElement("small");
    sensorRate.className = "sensor-rate";

    const divTitle = document.createElement("div");
    divTitle.className = "sensor-title"

    divTitle.append(sensorId, sensorRate);

    const value = document.createElement("strong");
    value.className = "sensor-value";

    const unit = document.createElement("small");
    unit.className = "sensor-unit";

    const voltage = document.createElement("small");
    voltage.className = "sensor-voltage";

    const flags = document.createElement("div");
    flags.className = "sensor-flags";

    const errorFlag = document.createElement("span");
    errorFlag.className = "sensor-flag sensor-error";
    errorFlag.textContent = "Read error";

    const alarmFlag = document.createElement("span");
    alarmFlag.className = "sensor-flag sensor-alarm";
    alarmFlag.textContent = "Alarm";

    flags.append(errorFlag, alarmFlag);

    element.append(name, divTitle, value, unit, voltage, flags);

    return { element };
}

function updateSensorCard(card, sensor, unit) {

    const { element } = card;
    const setText = (selector, text) => {
        const target = element.querySelector(selector);
        if (target.textContent !== text) target.textContent = text;
    };

    setText(".sensor-name", typeof sensor.name === "string" && sensor.name ? sensor.name : sensor.id);
    setText(".sensor-id", sensor.id);

    setText(".sensor-value", "--");
    setText(".sensor-unit", typeof unit.name === "string" ? unit.name : "");
    setText(".sensor-voltage", "--V");

//     const hasError = sensor.error === true;
//     const hasAlarm = sensor.alarm === true;
//     element.classList.toggle("has-error", hasError);
//     element.classList.toggle("has-alarm", hasAlarm);
//     element.querySelector(".sensor-error").hidden = !hasError;
//     element.querySelector(".sensor-alarm").hidden = !hasAlarm;

    element.classList.toggle("has-error", false);
    element.classList.toggle("has-alarm", false);
    element.querySelector(".sensor-error").hidden = true;
    element.querySelector(".sensor-alarm").hidden = true;

}

function updateSensorsValue(data) {
    
    if (!data || typeof data !== "object") return;

    const setText = (element, selector, text) => {
        const target = element.querySelector(selector);
        if (target.textContent !== text) target.textContent = text;
    };

    for (const [sensorId, sensorData] of Object.entries(data)) {
        
        let card = sensorCards.get(sensorId);
        if (card) {

            setText(card.element, ".sensor-value", (sensorData.value !== null ? sensorData.value : "-" ));
            setText(card.element, ".sensor-rate", sensorData.srate + " reads/s");
            setText(card.element, ".sensor-voltage", (sensorData.voltage !== null ? sensorData.voltage : "-") + "V");

        }

    }
    
}

// function displayDevices(devices) {
//     const connectedCount = devices.filter(device => device.connected).length;
//     deviceCount.textContent = `${devices.length} ${devices.length === 1 ? "device" : "devices"} · ${connectedCount} connected`;

//     if (devices.length === 0) {
//         for (const card of deviceList.querySelectorAll(".device-card")) {
//             card.remove();
//         }

//         if (!deviceList.querySelector(".empty-state")) {
//             const emptyState = document.createElement("p");
//             emptyState.className = "empty-state";
//             emptyState.textContent = "No devices are paired with this hub yet.";
//             deviceList.append(emptyState);
//         }
//         return;
//     }

//     deviceList.querySelector(".empty-state")?.remove();

//     const existingCards = new Map(
//         [...deviceList.querySelectorAll(".device-card[data-mac]")]
//             .map(card => [card.dataset.mac, card])
//     );
//     const currentMacs = new Set(devices.map(device => device.mac));

//     for (const [mac, card] of existingCards) {
//         if (!currentMacs.has(mac)) {
//             card.remove();
//         }
//     }

//     devices.forEach((device, index) => {
//         let card = existingCards.get(device.mac);

//         if (!card) {
//             card = createDeviceCard(device);
//         }

//         updateDeviceCard(card, device);
//         const position = deviceList.children[index];
//         if (position !== card) {
//             deviceList.insertBefore(card, position || null);
//         }
//     });
// }

function refreshDevices(devices) {

    // Remove card if needed
    const domCards = deviceList.querySelectorAll(`.device-card[data-uid]`);
    for (const card of domCards) {
        const uid = card.getAttribute("data-uid");
        let find = false;
        for (const device of devices) {
            if (device.uID == uid) { find = true; break; }
        }
        if (!find) card.remove();
    }

    let nbConnected = 0;

    for (const device of devices) {
        if (device.connected) nbConnected++;
        createDeviceCard(device);
    }

    deviceCount.textContent = `${devices.length} ${devices.length === 1 ? "device" : "devices"} · ${nbConnected} connected`;

}

function createDeviceCard(device) {

    const deviceUID = device.uID;
    const isAdmin = device.type == "admin";

    const domCard = deviceList.querySelector(`.device-card[data-uid='${deviceUID}']`);

    if (domCard) {
        return;
    }

    const card = document.createElement("article");
    card.className = "device-card";
    card.dataset.uid = device.uID;

    const identity = document.createElement("div");
    const name = document.createElement("span");
    name.className = "device-name";
    name.textContent = device.name || "Unnamed device";
    if (isAdmin) name.textContent = "Administrator"

    const mac = document.createElement("span");
    mac.className = "device-mac";
    mac.textContent = device.mac;
    identity.append(name, mac);

    const status = document.createElement("span");
    status.className = `device-status ${device.connected ? "online" : "offline"}`;
    status.textContent = device.connected ? "Connected" : "Disconnected";

    const form = document.createElement("form");
    form.className = "device-name-form";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 32;
    input.value = device.name || "";
    if (isAdmin) { 
        input.value = "Administrator";
        input.readOnly = true;
    }

    input.placeholder = "Add a name";
    input.setAttribute("aria-label", `Name for device ${device.mac}`);
    const saveButton = document.createElement("button");
    name.className = "device-savename";
    saveButton.textContent = "Save name";
    saveButton.type = "button";
    if (isAdmin) saveButton.disabled = true;
    form.append(input, saveButton);

    saveButton.addEventListener("click", async () => {
        sendWSCommand(wsCom, "device.setname", { 'uID': device.uID, 'name': input.value });
    });

    const rejectButton = document.createElement("button");
    rejectButton.type = "button";
    rejectButton.className = "reject-device-button";
    rejectButton.textContent = "Reject device";
    if (isAdmin) rejectButton.disabled = true;
    rejectButton.addEventListener("click", async () => {
        rejectButton.disabled = true;
        sendWSCommand(wsCom, "device.reject", { 'uID': device.uID });
    });

    card.append(identity, status, form, rejectButton);

    deviceList.append(card);
    
}

// function updateDeviceCard(card, device) {
//     const name = card.querySelector(".device-name");
//     const mac = card.querySelector(".device-mac");
//     const status = card.querySelector(".device-status");
//     const input = card.querySelector(".device-name-form input");
//     const rejectButton = card.querySelector(".reject-device-button");
//     const displayName = device.name || "Unnamed device";
//     const statusText = device.connected ? "Connected" : "Disconnected";

//     if (name.textContent !== displayName) {
//         name.textContent = displayName;
//     }
//     if (mac.textContent !== device.mac) {
//         mac.textContent = device.mac;
//     }
//     status.classList.toggle("online", device.connected);
//     status.classList.toggle("offline", !device.connected);
//     if (status.textContent !== statusText) {
//         status.textContent = statusText;
//     }

//     if (document.activeElement !== input && input.value !== (device.name || "")) {
//         input.value = device.name || "";
//     }
//     if (rejectButton.getAttribute("aria-label") !== `Reject device ${device.mac}`) {
//         rejectButton.setAttribute("aria-label", `Reject device ${device.mac}`);
//     }
// }

// async function refreshDevices() {
//     displayDevices(await getDevices());
// }

function refreshPairingRequests(pairingRequests = []) {

    pairingCount.textContent = `${pairingRequests.length} pending ${pairingRequests.length === 1 ? "request" : "requests"}`;

    // Remove card if needed
    const currentPairingCard = [...pairingList.querySelectorAll(".pairing-card[data-uid]")];
    for (const card of currentPairingCard) {
        const uid = card.getAttribute("data-uid");
        let find = false;
        for (const device of pairingRequests) {
            if (device.uID == uid) { find = true; break; }
        }
        if (!find) card.remove();
    }

    if (pairingRequests.length === 0) {
        if (!pairingList.querySelector(".empty-state")) {
            const emptyState = document.createElement("p");
            emptyState.className = "empty-state";
            emptyState.textContent = "No devices are waiting for approval.";
            pairingList.append(emptyState);
        }
        return;
    }

    pairingList.querySelector(".empty-state")?.remove();

    for (const device of pairingRequests) {
        
        const deviceMAC = device.mac;
        const deviceUID = device.uID;

        const domPairingCard = [...pairingList.querySelectorAll(`.pairing-card[data-uid='${deviceUID}']`)];
        
        if (!domPairingCard.length) {

            const card = document.createElement("article");
            card.className = "device-card pairing-card";
            card.dataset.uid = deviceUID;

            const identity = document.createElement("div");
            const name = document.createElement("span");
            name.className = "device-name";
            name.textContent = device.name || "Unnamed device";
            const mac = document.createElement("span");
            mac.className = "device-mac";
            mac.textContent = deviceMAC;
            identity.append(name, mac);

            const status = document.createElement("span");
            status.className = "device-status pairing";
            status.textContent = "Awaiting approval";

            const codeForm = document.createElement("form");
            codeForm.className = "pairing-code-form";

            const codeLabel = document.createElement("label");
            codeLabel.textContent = "Code shown on device";

            const codeInput = document.createElement("input");
            codeInput.type = "text";
            codeInput.inputMode = "numeric";
            codeInput.maxLength = 8;
            codeInput.pattern = "[0-9]{8}";
            codeInput.className = "pairing-code-input";
            codeInput.placeholder = "8-digit code";
            codeInput.value = "";
            codeInput.autocomplete = "one-time-code";
            codeInput.setAttribute("aria-label", `Pairing code displayed by device ${device.mac}`);
            codeForm.append(codeLabel, codeInput);

            const approveButton = document.createElement("button");
            approveButton.type = "submit";
            approveButton.className = "pairing-approve";
            approveButton.textContent = "Approve";
            codeForm.append(approveButton);

            const codeError = document.createElement("small");
            codeError.className = "pairing-code-error";
            codeError.setAttribute("role", "status");
            codeForm.append(codeError);

            codeForm.addEventListener("submit", async event => {
                
                event.preventDefault();
                const code = codeInput.value.trim();
                if (!/^\d{8}$/.test(code)) {
                    codeError.textContent = "Enter the 8-digit code shown by the device.";
                    return;
                }

                approveButton.disabled = true;
                rejectButton.disabled = true;

                sendWSCommand(wsCom, "pairing.code", { 'uID': device.uID, "code": code });                

            });

            const rejectButton = document.createElement("button");
            rejectButton.type = "button";
            rejectButton.className = "reject-device-button";
            rejectButton.textContent = "Reject";
            rejectButton.addEventListener("click", async event => {

                event.preventDefault();

                approveButton.disabled = true;
                rejectButton.disabled = true;

                sendWSCommand(wsCom, "pairing.reject", { 'uID': device.uID });

            });

            const actions = document.createElement("div");
            actions.className = "pairing-actions";
            actions.append(rejectButton);

            card.append(identity, status, codeForm, actions);
            pairingList.append(card);

        }

    }

}

function refreshPairingWindow(isopen = false, remaingMs = 60000) {

    if (!remaingMs) isopen = false; 

    if (!isopen) {
        pairingWindowStatus.textContent = "Pairing mode is closed";
        pairingWindowStatus.classList.remove("pairing-window-open");
        pairingWindowButton.textContent = `Open pairing mode (${Math.ceil(remaingMs / 1000)} sec)`;
        return;
    }

    const secondsRemaining = Math.max(0, Math.ceil((remaingMs / 1000)));
    pairingWindowStatus.textContent = `Pairing mode open · ${secondsRemaining}s remaining`;
    pairingWindowStatus.classList.add("pairing-window-open");
    pairingWindowButton.textContent = "Close pairing mode";

}

async function initialize() {

    const status = await getAuthStatus();

    refreshPairingRequests();
    refreshPairingWindow();

    wsCom = connectWebSocket(status => {
        connectionStatus.textContent = status;
        connectionStatus.classList.toggle("online", status === "Connected");
        connectionStatus.classList.toggle("offline", status !== "Connected");
    });

}

function connectWebSocket(onStatus) {
    
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${location.host}/ws/admin`);

    socket.addEventListener("open", () => {
        onStatus?.("Connected");
        socket.send(JSON.stringify({ 'type': 'webadmin.init', 'data': null }));
    });

    socket.addEventListener("message", event => {
        
        let message = null;
        
        try {
            message = JSON.parse(event.data);
        } catch (error) {
            console.error("Invalid WebSocket message", error);
            return;
        }

        switch(message.type) {

            case "initialize":
                displaySensors(message.data.sensors, true);
                refreshPairingRequests(message.data.pairingrequests);
                break;

            case "sensors.list":
                displaySensors(message.data, true);
                break;
            
            case "sensors.value":
                updateSensorsValue(message.data);
                break;

            case "pairing.requests":
                refreshPairingRequests(message.data);
                break;

            case "pairing.remainingms":
                refreshPairingWindow(true, message.data);
                break;

            case "pairing.wrongcode":
                
                const card = pairingList.querySelector(`.pairing-card[data-uid='${message.data.uID}']`);
                if (!card) return;

                const target = card.querySelector(`.pairing-code-error`);
                if (target) target.textContent = `Wrong pairing code. You have ${message.data.remainingAttempts} attempt(s) remaining.`;

                const button = card.querySelectorAll('button').forEach(button => {
                    button.disabled = false;
                });

                break;

            case "devices.list":

                refreshDevices( message.data);
                break;

        }

    });

    socket.addEventListener("close", () => {
        onStatus?.("Disconnected");

        //Wait an try to reconnect
        setTimeout(() => {
            connectWebSocket(onData, onStatus);
        }, 2000);

    });

    socket.addEventListener("error", () => {
        onStatus?.("Connection error");
    });

    return socket;

}

pairingWindowButton.addEventListener("click", async () => {

    pairingWindowButton.disabled = true;
    try {
        const enabled = !pairingWindowStatus.classList.contains("pairing-window-open");
        sendWSCommand(wsCom, "pairing.window", enabled ? "start" : "stop");
    } catch (error) {
            pairingWindowStatus.textContent = error.message;
    } finally {
        pairingWindowButton.disabled = false;
    }

});

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await logout();
    } finally {
        window.location.href = "/login";
    }
});

initialize();

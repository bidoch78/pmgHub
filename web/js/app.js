import {
    approveDevice,
    getDevices,
    getPairingRequests,
    getSensors,
    logout,
    rejectDevice,
    rejectPairingRequest,
    updateDeviceName
} from "./api.js";
import { connectWebSocket } from "./websocket.js";

const connectionStatus = document.getElementById("connectionStatus");
const sensorGroups = document.getElementById("sensorGroups");
const deviceList = document.getElementById("deviceList");
const deviceCount = document.getElementById("deviceCount");
const pairingList = document.getElementById("pairingList");
const pairingCount = document.getElementById("pairingCount");
const sensorCards = new Map();
const sensorCategoryGroups = new Map();

function displaySensors(data) {
    if (!data || !Array.isArray(data.sensors)) {
        return;
    }

    const receivedIds = new Set();
    const activeCategories = new Set();

    for (const sensor of data.sensors) {
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
        updateSensorCard(card, sensor);

        if (card.element.parentElement !== group.grid) {
            group.grid.append(card.element);
        }
    }

    for (const [id, card] of sensorCards) {
        if (!receivedIds.has(id)) {
            card.element.remove();
            sensorCards.delete(id);
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
    element.append(name, sensorId, value, unit, voltage, flags);
    return { element };
}

function updateSensorCard(card, sensor) {
    const { element } = card;
    const setText = (selector, text) => {
        const target = element.querySelector(selector);
        if (target.textContent !== text) target.textContent = text;
    };

    setText(".sensor-name", typeof sensor.name === "string" && sensor.name ? sensor.name : sensor.id);
    setText(".sensor-id", sensor.id);
    setText(".sensor-value", typeof sensor.value === "number" && Number.isFinite(sensor.value) ? String(sensor.value) : "--");
    setText(".sensor-unit", typeof sensor.unit === "string" ? sensor.unit : "");
    setText(".sensor-voltage", typeof sensor.voltage === "number" && Number.isFinite(sensor.voltage)
        ? `${sensor.voltage.toFixed(3)} V`
        : "Voltage unavailable");

    const hasError = sensor.error === true;
    const hasAlarm = sensor.alarm === true;
    element.classList.toggle("has-error", hasError);
    element.classList.toggle("has-alarm", hasAlarm);
    element.querySelector(".sensor-error").hidden = !hasError;
    element.querySelector(".sensor-alarm").hidden = !hasAlarm;
}

function displayDevices(devices) {
    const connectedCount = devices.filter(device => device.connected).length;
    deviceCount.textContent = `${devices.length} ${devices.length === 1 ? "device" : "devices"} · ${connectedCount} connected`;

    if (devices.length === 0) {
        for (const card of deviceList.querySelectorAll(".device-card")) {
            card.remove();
        }

        if (!deviceList.querySelector(".empty-state")) {
            const emptyState = document.createElement("p");
            emptyState.className = "empty-state";
            emptyState.textContent = "No devices are paired with this hub yet.";
            deviceList.append(emptyState);
        }
        return;
    }

    deviceList.querySelector(".empty-state")?.remove();

    const existingCards = new Map(
        [...deviceList.querySelectorAll(".device-card[data-mac]")]
            .map(card => [card.dataset.mac, card])
    );
    const currentMacs = new Set(devices.map(device => device.mac));

    for (const [mac, card] of existingCards) {
        if (!currentMacs.has(mac)) {
            card.remove();
        }
    }

    devices.forEach((device, index) => {
        let card = existingCards.get(device.mac);

        if (!card) {
            card = createDeviceCard(device);
        }

        updateDeviceCard(card, device);
        const position = deviceList.children[index];
        if (position !== card) {
            deviceList.insertBefore(card, position || null);
        }
    });
}

function createDeviceCard(device) {
    const card = document.createElement("article");
    card.className = "device-card";
    card.dataset.mac = device.mac;

    const identity = document.createElement("div");
    const name = document.createElement("span");
    name.className = "device-name";
    name.textContent = device.name || "Unnamed device";
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
    input.placeholder = "Add a name";
    input.setAttribute("aria-label", `Name for device ${device.mac}`);
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Save name";
    form.append(input, saveButton);

    form.addEventListener("submit", async event => {
        event.preventDefault();
        saveButton.disabled = true;

        try {
            await updateDeviceName(card.dataset.mac, input.value.trim());
            saveButton.textContent = "Save name";
            await refreshDevices();
        } catch (error) {
            console.error(error);
            saveButton.textContent = "Retry";
        } finally {
            saveButton.disabled = false;
        }
    });

    const rejectButton = document.createElement("button");
    rejectButton.type = "button";
    rejectButton.className = "reject-device-button";
    rejectButton.textContent = "Reject device";
    rejectButton.addEventListener("click", async () => {
        const currentName = card.querySelector(".device-name").textContent;
        const mac = card.dataset.mac;
        const deviceName = currentName === "Unnamed device" ? mac : currentName;
        if (!window.confirm(`Reject and remove ${deviceName} from this hub?`)) {
            return;
        }

        rejectButton.disabled = true;

        try {
            await rejectDevice(mac);
            await refreshDevices();
        } catch (error) {
            console.error(error);
            rejectButton.textContent = "Retry rejection";
            rejectButton.disabled = false;
        }
    });

    card.append(identity, status, form, rejectButton);
    return card;
}

function updateDeviceCard(card, device) {
    const name = card.querySelector(".device-name");
    const mac = card.querySelector(".device-mac");
    const status = card.querySelector(".device-status");
    const input = card.querySelector(".device-name-form input");
    const rejectButton = card.querySelector(".reject-device-button");
    const displayName = device.name || "Unnamed device";
    const statusText = device.connected ? "Connected" : "Disconnected";

    if (name.textContent !== displayName) {
        name.textContent = displayName;
    }
    if (mac.textContent !== device.mac) {
        mac.textContent = device.mac;
    }
    status.classList.toggle("online", device.connected);
    status.classList.toggle("offline", !device.connected);
    if (status.textContent !== statusText) {
        status.textContent = statusText;
    }

    if (document.activeElement !== input && input.value !== (device.name || "")) {
        input.value = device.name || "";
    }
    if (rejectButton.getAttribute("aria-label") !== `Reject device ${device.mac}`) {
        rejectButton.setAttribute("aria-label", `Reject device ${device.mac}`);
    }
}

async function refreshDevices() {
    displayDevices(await getDevices());
}

async function refreshPairingRequests() {
    const requests = await getPairingRequests();
    pairingList.replaceChildren();
    pairingCount.textContent = `${requests.length} pending ${requests.length === 1 ? "request" : "requests"}`;

    if (requests.length === 0) {
        const emptyState = document.createElement("p");
        emptyState.className = "empty-state";
        emptyState.textContent = "No devices are waiting for approval.";
        pairingList.append(emptyState);
        return;
    }

    for (const device of requests) {
        const card = document.createElement("article");
        card.className = "device-card pairing-card";

        const identity = document.createElement("div");
        const name = document.createElement("span");
        name.className = "device-name";
        name.textContent = device.name || "Unnamed device";
        const mac = document.createElement("span");
        mac.className = "device-mac";
        mac.textContent = device.mac;
        identity.append(name, mac);

        const status = document.createElement("span");
        status.className = "device-status pairing";
        status.textContent = "Awaiting approval";

        const actions = document.createElement("div");
        actions.className = "pairing-actions";
        const approveButton = document.createElement("button");
        approveButton.type = "button";
        approveButton.textContent = "Approve";
        approveButton.addEventListener("click", async () => {
            approveButton.disabled = true;
            try {
                await approveDevice(device.mac);
                await Promise.all([refreshDevices(), refreshPairingRequests()]);
            } catch (error) {
                console.error(error);
                approveButton.textContent = "Retry approval";
                approveButton.disabled = false;
            }
        });

        const rejectButton = document.createElement("button");
        rejectButton.type = "button";
        rejectButton.className = "reject-device-button";
        rejectButton.textContent = "Reject";
        rejectButton.addEventListener("click", async () => {
            rejectButton.disabled = true;
            try {
                await rejectPairingRequest(device.mac);
                await refreshPairingRequests();
            } catch (error) {
                console.error(error);
                rejectButton.textContent = "Retry rejection";
                rejectButton.disabled = false;
            }
        });
        actions.append(approveButton, rejectButton);

        card.append(identity, status, actions);
        pairingList.append(card);
    }
}

async function initialize() {
    try {
        displaySensors(await getSensors());
    } catch (error) {
        console.error(error);
    }

    try {
        await refreshDevices();
    } catch (error) {
        console.error(error);
        deviceCount.textContent = "Unable to load devices";
    }

    try {
        await refreshPairingRequests();
    } catch (error) {
        console.error(error);
        pairingCount.textContent = "Unable to load requests";
    }

    connectWebSocket(displaySensors, status => {
        connectionStatus.textContent = status;
        connectionStatus.classList.toggle("online", status === "Connected");
        connectionStatus.classList.toggle("offline", status !== "Connected");
    });

    window.setInterval(() => {
        refreshDevices().catch(error => console.error(error));
        refreshPairingRequests().catch(error => console.error(error));
    }, 2000);
}

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await logout();
    } finally {
        window.location.href = "/login";
    }
});

initialize();

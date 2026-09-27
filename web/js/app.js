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

const fields = {
    rpm: document.getElementById("rpm"),
    coolant: document.getElementById("coolant"),
    oilPressure: document.getElementById("oilPressure"),
    fuelPressure: document.getElementById("fuelPressure"),
    ethanol: document.getElementById("ethanol")
};

const connectionStatus = document.getElementById("connectionStatus");
const deviceList = document.getElementById("deviceList");
const deviceCount = document.getElementById("deviceCount");
const pairingList = document.getElementById("pairingList");
const pairingCount = document.getElementById("pairingCount");

function displaySensors(data) {
    for (const [key, element] of Object.entries(fields)) {
        if (element && data[key] !== undefined) {
            element.textContent = data[key];
        }
    }
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

    connectWebSocket(
        displaySensors,
        status => connectionStatus.textContent = status
    );

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

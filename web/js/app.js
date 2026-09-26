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
    deviceList.replaceChildren();

    const connectedCount = devices.filter(device => device.connected).length;
    deviceCount.textContent = `${devices.length} ${devices.length === 1 ? "device" : "devices"} · ${connectedCount} connected`;

    if (devices.length === 0) {
        const emptyState = document.createElement("p");
        emptyState.className = "empty-state";
        emptyState.textContent = "No devices are paired with this hub yet.";
        deviceList.append(emptyState);
        return;
    }

    for (const device of devices) {
        const card = document.createElement("article");
        card.className = "device-card";

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
                await updateDeviceName(device.mac, input.value.trim());
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
        rejectButton.setAttribute("aria-label", `Reject device ${device.mac}`);
        rejectButton.addEventListener("click", async () => {
            const deviceName = device.name || device.mac;
            if (!window.confirm(`Reject and remove ${deviceName} from this hub?`)) {
                return;
            }

            rejectButton.disabled = true;

            try {
                await rejectDevice(device.mac);
                await refreshDevices();
            } catch (error) {
                console.error(error);
                rejectButton.textContent = "Retry rejection";
                rejectButton.disabled = false;
            }
        });

        card.append(identity, status, form, rejectButton);
        deviceList.append(card);
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

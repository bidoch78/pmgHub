const deviceList = document.getElementById("deviceList");
const deviceCount = document.getElementById("deviceCount");
const appMessage = document.getElementById("appMessage");
const hubUrlInput = document.getElementById("hubUrl");
const deviceTemplate = document.getElementById("deviceTemplate");

hubUrlInput.value = localStorage.getItem("pmghub-url") || "";
hubUrlInput.addEventListener("change", () => {
    localStorage.setItem("pmghub-url", hubUrlInput.value.trim());
});

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "The request could not be completed.");
    }

    return response.status === 204 ? null : response.json();
}

function setMessage(message = "") {
    appMessage.textContent = message;
}

function statusPresentation(device) {
    if (device.connected) return { label: "Connected", className: "connected" };
    if (device.pairingRequested) return { label: "Waiting for approval", className: "waiting" };
    if (device.paired) return { label: "Disconnected", className: "disconnected" };
    return { label: "Not paired", className: "disconnected" };
}

function renderDevices(devices) {
    deviceList.replaceChildren();
    deviceCount.textContent = `${devices.length} ${devices.length === 1 ? "device" : "devices"}`;

    if (devices.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No devices yet. Create a virtual pmgDevice to get started.";
        deviceList.append(empty);
        return;
    }

    for (const device of devices) {
        const card = deviceTemplate.content.firstElementChild.cloneNode(true);
        const nameInput = card.querySelector(".device-name-input");
        const macInput = card.querySelector(".mac-input");
        const status = card.querySelector(".device-status");
        const pairButton = card.querySelector(".pair-button");
        const pairState = card.querySelector(".pair-state");
        const deleteButton = card.querySelector(".delete-button");
        const presentation = statusPresentation(device);

        nameInput.value = device.name;
        nameInput.setAttribute("aria-label", `Name for device ${device.mac}`);
        macInput.value = device.mac;
        macInput.setAttribute("aria-label", `MAC address for device ${device.mac}`);
        status.classList.add(presentation.className);
        status.querySelector(".status-label").textContent = presentation.label;
        pairState.textContent = device.paired ? "Token stored on device and hub" : "No pairing token stored";

        nameInput.addEventListener("change", async () => {
            try {
                await apiRequest(`/api/devices/${encodeURIComponent(device.mac)}`, {
                    method: "PATCH",
                    body: JSON.stringify({ name: nameInput.value.trim() })
                });
                setMessage("Device name saved.");
                await loadDevices();
            } catch (error) {
                setMessage(error.message);
            }
        });

        pairButton.hidden = device.paired;
        pairButton.disabled = device.pairingRequested;
        pairButton.textContent = device.pairingRequested ? "Request sent" : "Pair with hub";
        pairButton.addEventListener("click", async () => {
            pairButton.disabled = true;
            setMessage("");
            try {
                await apiRequest(`/api/devices/${encodeURIComponent(device.mac)}/pair`, {
                    method: "POST",
                    body: JSON.stringify({ hubUrl: hubUrlInput.value.trim() })
                });
                setMessage("Pairing request sent. Approve this device in the pmgHub dashboard.");
                await loadDevices();
            } catch (error) {
                pairButton.disabled = false;
                setMessage(error.message);
            }
        });

        deleteButton.addEventListener("click", async () => {
            if (!window.confirm(`Delete device ${device.mac} from this simulator?`)) return;
            deleteButton.disabled = true;
            try {
                await apiRequest(`/api/devices/${encodeURIComponent(device.mac)}`, { method: "DELETE" });
                setMessage("Device deleted from this simulator.");
                await loadDevices();
            } catch (error) {
                deleteButton.disabled = false;
                setMessage(error.message);
            }
        });

        deviceList.append(card);
    }
}

async function loadDevices() {
    renderDevices(await apiRequest("/api/devices"));
}

document.getElementById("createDeviceButton").addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    setMessage("");
    try {
        await apiRequest("/api/devices", {
            method: "POST",
            body: JSON.stringify({ name: "pmgDevice" })
        });
        setMessage("Device created with a generated MAC address.");
        await loadDevices();
    } catch (error) {
        setMessage(error.message);
    } finally {
        button.disabled = false;
    }
});

loadDevices().catch(error => {
    deviceCount.textContent = "Unable to load devices";
    setMessage(error.message);
});
apiRequest("/api/config").then(config => {
    if (!hubUrlInput.value) hubUrlInput.value = config.defaultHubUrl;
}).catch(error => setMessage(error.message));
window.setInterval(() => loadDevices().catch(error => setMessage(error.message)), 1500);

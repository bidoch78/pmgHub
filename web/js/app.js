import { getSensors, logout } from "./api.js";
import { connectWebSocket } from "./websocket.js";

const fields = {
    rpm: document.getElementById("rpm"),
    coolant: document.getElementById("coolant"),
    oilPressure: document.getElementById("oilPressure"),
    fuelPressure: document.getElementById("fuelPressure"),
    ethanol: document.getElementById("ethanol")
};

const connectionStatus = document.getElementById("connectionStatus");

function displaySensors(data) {
    for (const [key, element] of Object.entries(fields)) {
        if (element && data[key] !== undefined) {
            element.textContent = data[key];
        }
    }
}

async function initialize() {
    try {
        displaySensors(await getSensors());
    } catch (error) {
        console.error(error);
    }

    connectWebSocket(
        displaySensors,
        status => connectionStatus.textContent = status
    );
}

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await logout();
    } finally {
        window.location.href = "/login";
    }
});

initialize();

async function request(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    if (response.status === 401) {
        window.location.href = "/login";
        throw new Error("Not authenticated");
    }

    return response;
}

export async function getSensors() {
    const response = await request("/api/sensors");
    return response.json();
}

export async function getDevices() {
    const response = await request("/api/devices");

    if (!response.ok) {
        throw new Error("Unable to load registered devices");
    }

    return response.json();
}

export async function updateDeviceName(mac, name) {
    const response = await request(`/api/devices/${encodeURIComponent(mac)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok) {
        throw new Error("Unable to update device name");
    }

    return response.json();
}

export async function rejectDevice(mac) {
    const response = await request(`/api/devices/${encodeURIComponent(mac)}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error("Unable to reject device");
    }
}

export async function login(username, password) {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        throw new Error("Incorrect username or password");
    }
}

export async function getAuthStatus() {
    const response = await fetch("/api/auth/status");

    if (!response.ok) {
        throw new Error("Unable to check credential status");
    }

    return response.json();
}

export async function initializeCredentials(username, password) {
    const response = await fetch("/api/auth/initialize", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        if (error.error === "CREDENTIALS_ALREADY_INITIALIZED") {
            throw new Error("Credentials have already been initialized");
        }

        throw new Error("Unable to initialize credentials");
    }
}

export async function logout() {
    await request("/api/logout", {
        method: "POST"
    });
}

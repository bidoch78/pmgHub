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

export function sendWSCommand(socket, type, data = null) {
    if (!socket) return false;
    if (socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ 'type': type, 'data': data }));
    return true;
}

export async function login(password) {

    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password })
    });

    if (!response.ok) throw new Error("Incorrect password");

}

export async function getAuthStatus() {
    
    const response = await fetch("/api/auth/status");
    if (!response.ok) { throw new Error("Unable to check credential status"); }
    return response.json();

}

export async function initializeCredentials(password) {

    const response = await fetch("/api/auth/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
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

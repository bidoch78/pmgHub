export function connectWebSocket(onData, onStatus) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);

    socket.addEventListener("open", () => {
        onStatus?.("Connected");
    });

    socket.addEventListener("message", event => {
        try {
            onData(JSON.parse(event.data));
        } catch (error) {
            console.error("Invalid WebSocket message", error);
        }
    });

    socket.addEventListener("close", () => {
        onStatus?.("Disconnected");

        setTimeout(() => {
            connectWebSocket(onData, onStatus);
        }, 2000);
    });

    socket.addEventListener("error", () => {
        onStatus?.("Connection error");
    });

    return socket;
}

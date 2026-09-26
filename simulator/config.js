const path = require("path");

module.exports = {
    port: 3000,
    
    webRoot: path.resolve(__dirname, "../web"),

    auth: {
        sessionTimeoutMs: 60 * 60 * 1000,
        maxSessions: 5
    },

    websocketIntervalMs: 250
};

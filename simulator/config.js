/********************
 * 
 * EXPORTS
 * YBI 01/10/2026
 * 
 */

const path = require("path");

module.exports = {
    port: Number(process.env.PORT || 3000),
    
    webRoot: path.resolve(__dirname, "../web"),

    auth: {
        sessionTimeoutMs: 60 * 60 * 1000, // web interface timeout
        maxSessions: 10 // web interface + devices
    }
};

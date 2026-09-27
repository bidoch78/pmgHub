const crypto = require("crypto");

class SessionManager {
    constructor(maxSessions = 5, timeoutMs = 60 * 60 * 1000) {
        this.maxSessions = maxSessions;
        this.timeoutMs = timeoutMs;
        this.sessions = new Map();
    }

    cleanup() {
        const now = Date.now();

        for (const [token, session] of this.sessions.entries()) {
            if (now - session.lastActivity > this.timeoutMs) {
                this.sessions.delete(token);
            }
        }
    }

    create() {
        this.cleanup();

        if (this.sessions.size >= this.maxSessions) {
            return null;
        }

        const token = crypto.randomBytes(32).toString("hex");

        this.sessions.set(token, { lastActivity: Date.now() });

        return token;
    }

    validate(token) {
        if (!token) {
            return false;
        }

        const session = this.sessions.get(token);

        if (!session) {
            return false;
        }

        if (Date.now() - session.lastActivity > this.timeoutMs) {
            this.sessions.delete(token);
            return false;
        }

        session.lastActivity = Date.now();
        return true;
    }

    remove(token) {
        return this.sessions.delete(token);
    }

    getActiveCount() {
        this.cleanup();
        return this.sessions.size;
    }
}

module.exports = SessionManager;

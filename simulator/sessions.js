/********************
 * 
 * SessionManager
 * YBI 01/10/2026
 * 
 * Finally SessionManager is used only by WebAdmin
 *
 */

const crypto = require("crypto");

class SessionManager {

    static SESSION_WEBADMIN = 'webAdmin';
    static SESSION_DEVICE = 'device';

    /* default max 10 connections & timeout after 1 hour of inactivity */
    constructor(timeoutMs = 60 * 60 * 1000) {
        this.timeoutMs = timeoutMs;
        this.sessions = new Map();
    }

    cleanup() {

        const now = Date.now();

        /* remove only session with token expired */
        for (const [token, session] of this.sessions.entries()) {
            if (now - session.lastActivity > this.timeoutMs) this.sessions.delete(token);
        }

    }

    //execute every x Ms
    optimizeClean() {
        return false;
    }

    create(session_type) {

        this.cleanup();

        const token = crypto.randomBytes(32).toString("hex");

        this.sessions.set(token, { lastActivity: Date.now(), type: (session_type === SessionManager.SESSION_WEBADMIN ? SessionManager.SESSION_WEBADMIN : SessionManager.SESSION_DEVICE ) });

        return token;

    }

    isType(token, session_type) { return this.getType(token) === session_type; }

    getType(token) {

        if (!token) return false;
        const session = this.sessions.get(token);
        if (!session) return null;

        return session.type

    }

    validate(token) {

        if (!token) return false;

        const session = this.sessions.get(token);
        if (!session) return false;

        if (Date.now() - session.lastActivity > this.timeoutMs) {
            this.sessions.delete(token);
            return false;
        }

        session.lastActivity = Date.now();
        return true;

    }

    remove(token) { return this.sessions.delete(token); }

    countActiveSessions() {
        this.cleanup();
        return this.sessions.size;
    }

}

module.exports = SessionManager;

/********************
 * 
 * SessionManager
 * YBI 01/10/2026
 * YBI 05/11/2026
 * 
 * Finally SessionManager is used only by WebAdmin
 *
 */

const crypto = require("crypto");

class SessionManager {

    static SESSION_WEBADMIN = 'webAdmin';
    static SESSION_DEVICE = 'device';

    /* default max 10 connections & timeout after 1 hour of inactivity */
    constructor(services, timeoutMs = 60 * 60 * 1000) {
        this._timeoutMs = timeoutMs;
        this._services = services;
        this._sessions = new Map();
    }

    cleanup() {

        const now = Date.now();

        /* remove only session with token expired */
        for (const [token, session] of this._sessions.entries()) {
            if (now - session.lastActivity > this._timeoutMs) this._sessions.delete(token);
        }

    }

    //execute every x Ms
    optimizeClean() {
        return false;
    }

    create(session_type) {

        this.cleanup();

        const token = crypto.randomBytes(32).toString("hex");

        this._sessions.set(token, { lastActivity: Date.now(), type: (session_type === SessionManager.SESSION_WEBADMIN ? SessionManager.SESSION_WEBADMIN : SessionManager.SESSION_DEVICE ) });

        return token;

    }

    isType(token, session_type) { return this.getType(token) === session_type; }

    getType(token) {

        if (!token) return false;
        const session = this._sessions.get(token);
        if (!session) return null;

        return session.type

    }

    validate(token) {

        if (!token) return false;

        const session = this._sessions.get(token);
        if (!session) return false;

        if (Date.now() - session.lastActivity > this._timeoutMs) {
            this._sessions.delete(token);
            return false;
        }

        session.lastActivity = Date.now();
        return true;

    }

    remove(token) { return this._sessions.delete(token); }

    countActiveSessions() {
        this.cleanup();
        return this._sessions.size;
    }

}

module.exports = SessionManager;

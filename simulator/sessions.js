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
const fs = require("fs");
const path = require("path");

class SessionManager {

    static SESSION_WEBADMIN = 'webAdmin';
    static SESSION_DEVICE = 'device';

    /* default max 10 connections & timeout after 1 hour of inactivity */
    constructor(services, timeoutMs = 60 * 60 * 1000, storePath = process.env.PMGHUB_SESSION_STORE_PATH || path.resolve(__dirname, "../data/sessions.json")) {
        this._maxSessions = 20;
        this._timeoutMs = timeoutMs;
        this._storePath = storePath;
        this._services = services;
        this._sessions = new Map();
        this.loadSessions();
    }

    loadSessions() {

        try {

            const sessions = JSON.parse(fs.readFileSync(this._storePath, "utf8"));

            if (Array.isArray(sessions)) {

                for (const svSession of sessions) {
                    /* here we reset lastActivity */
                    this._sessions.set(svSession.token, { lastActivity: Date.now(), type: svSession.type });
                }

            }

        } 
        catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Unable to read sessions store:", error);
            }
        }

    }

    saveSessions() {

        fs.mkdirSync(path.dirname(this._storePath), { recursive: true });
        
        if (this._sessions.size == 0) {
            fs.unlinkSync(this._storePath);
        }

        const sessionsRec = [];
        for (const [token, session] of this._sessions.entries()) {
            sessionsRec.push({ 'token': token, 'type': session.type });
        }
        fs.writeFileSync(this._storePath, JSON.stringify( sessionsRec, null, 2), 'utf8');

    }

    cleanup(save = true) {

        const now = Date.now();
        let cptDeleted = false;

        /* remove only session with token expired */
        for (const [token, session] of this._sessions.entries()) {
            if (now - session.lastActivity > this._timeoutMs) { 
                this._sessions.delete(token);
                cptDeleted++;
            }
        }

        if (cptDeleted && save) this.saveSessions();

    }

    create(session_type) {

        this.cleanup(false);

        const token = crypto.randomBytes(32).toString("hex");

        console.log("Create Session " + session_type);
        if (this.countActiveSessions() == this._maxSessions) {
            //Remove the oldest session
            let oldestSession = null; let oldestToken = null;
            for (const [token, session] of this._sessions.entries()) {
                if (!oldestSession || oldestSession.lastActivity > session.lastActivity) { oldestSession = session; oldestToken = token; }
            }
            if (oldestToken) this._sessions.delete(oldestToken);
        }

        this._sessions.set(token, { lastActivity: Date.now(), type: (session_type === SessionManager.SESSION_WEBADMIN ? SessionManager.SESSION_WEBADMIN : SessionManager.SESSION_DEVICE ) });
        this.saveSessions();

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
            this.remove(token);
            return false;
        }

        session.lastActivity = Date.now();
        return true;

    }

    remove(token) { 
        const retBool = this._sessions.delete(token); 
        this.saveSessions();
        return retBool; 
    }

    countActiveSessions() {
        this.cleanup();
        return this._sessions.size;
    }

}

module.exports = SessionManager;

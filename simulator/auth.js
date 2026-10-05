/********************
 * 
 * COOKIE MANAGEMENT
 * YBI 01/10/2026
 * 
 */

function parseCookies(cookieHeader = "") {

    const cookies = {};

    cookieHeader.split(";").forEach(part => {

        const index = part.indexOf("=");

        if (index < 0) return;

        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();

        if (name) cookies[name] = value;

    });

    return cookies;

}

function getSessionToken(req) { return parseCookies(req.headers.cookie).session || null; }

function setSessionCookie(res, token, maxAgeMs = 3600) {
    res.setHeader("Set-Cookie", `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ (Math.floor(maxAgeMs / 1000)) }`);
}

function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
}

function isAuthenticated(req, sessions) { return sessions.validate(getSessionToken(req)); }

function getSessionTypeAuthenticated(req, sessions) { 
    const token = getSessionToken(req);
    if (!sessions.validate(token)) return null;
    return sessions.getType(token);
}

module.exports = {
    parseCookies,
    getSessionToken,
    isAuthenticated,
    setSessionCookie,
    clearSessionCookie,
    getSessionTypeAuthenticated
};

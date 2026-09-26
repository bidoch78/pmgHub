function parseCookies(cookieHeader = "") {
    const cookies = {};

    cookieHeader.split(";").forEach(part => {
        const index = part.indexOf("=");

        if (index < 0) {
            return;
        }

        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();

        if (name) {
            cookies[name] = value;
        }
    });

    return cookies;
}

function getSessionToken(req) {
    return parseCookies(req.headers.cookie).session || null;
}

function isAuthenticated(req, sessions) {
    return sessions.validate(getSessionToken(req));
}

function setSessionCookie(res, token, maxAgeSeconds = 3600) {
    res.setHeader(
        "Set-Cookie",
        `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`
    );
}

function clearSessionCookie(res) {
    res.setHeader(
        "Set-Cookie",
        "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
    );
}

module.exports = {
    parseCookies,
    getSessionToken,
    isAuthenticated,
    setSessionCookie,
    clearSessionCookie
};

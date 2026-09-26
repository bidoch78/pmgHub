const fs = require("fs");
const path = require("path");

const credentialsPath = path.join(__dirname, "credentials.json");

function readCredentials() {
    try {
        const data = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

        if (
            typeof data.username !== "string" ||
            typeof data.password !== "string" ||
            !data.username ||
            !data.password
        ) {
            return null;
        }

        return data;
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }

        throw error;
    }
}

function hasCredentials() {
    return readCredentials() !== null;
}

function initializeCredentials(username, password) {
    if (hasCredentials()) {
        return false;
    }

    fs.writeFileSync(
        credentialsPath,
        JSON.stringify({ username, password }, null, 2) + "\n",
        { flag: "wx", mode: 0o600 }
    );

    return true;
}

function areValidCredentials(username, password) {
    const credentials = readCredentials();

    return Boolean(
        credentials &&
        credentials.username === username &&
        credentials.password === password
    );
}

module.exports = {
    areValidCredentials,
    hasCredentials,
    initializeCredentials
};
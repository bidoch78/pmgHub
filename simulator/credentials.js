const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const credentialsPath = process.env.PMGHUB_CREDENTIALS_PATH || path.join(__dirname, "credentials.json");
const scryptOptions = { N: 16384, r: 8, p: 1 };

function createPasswordHash(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64, scryptOptions).toString("hex");
    return { algorithm: "scrypt", salt, hash };
}

// function persistCredentials(credentials) {
//     fs.writeFileSync(
//         credentialsPath,
//         JSON.stringify(credentials, null, 2) + "\n",
//         { mode: 0o600 }
//     );
// }

function readCredentials() {

    try {
        
        const data = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

        if (typeof data.password === "string" && data.password.length > 0) return data;

        switch(data.algorithm) {
            case "scrypt":
                if (typeof data.salt === "string" && 
                    typeof data.hash === "string" && 
                    /^[0-9a-f]{128}$/i.test(data.hash)) return data;
                break;
        }
        
        return null;

    } catch (error) {
         
        if (error.code === "ENOENT") return null;
        throw error;

    }

}

function hasCredentials() { return readCredentials() !== null; }

function initializeCredentials(password) {
   
    if (hasCredentials()) return false;

    if (typeof password !== "string" || !password) return false;

    fs.writeFileSync(credentialsPath, JSON.stringify(createPasswordHash(password), null, 2) + "\n", {
        flag: "wx",
        mode: 0o775
    });

    return true;

}

function isValidPassword(password) {

    if (typeof password !== "string" || !password) return false;

    const credentials = readCredentials();

//     if (!credentials) {
//         return false;
//     }

//     if (credentials.algorithm === "scrypt") {
//         const attemptedHash = crypto.scryptSync(password, credentials.salt, 64, scryptOptions);
//         const expectedHash = Buffer.from(credentials.hash, "hex");
//         return expectedHash.length === attemptedHash.length && crypto.timingSafeEqual(attemptedHash, expectedHash);
//     }

//     // Accept existing username/password files once, then migrate them to a password-only hash.
//     if (typeof credentials.password === "string") {
//         const attemptedPassword = Buffer.from(password);
//         const savedPassword = Buffer.from(credentials.password);
//         if (attemptedPassword.length === savedPassword.length && crypto.timingSafeEqual(attemptedPassword, savedPassword)) {
//             persistCredentials(createPasswordHash(password));
//             return true;
//         }
//     }

    return false;

}

module.exports = {
    isValidPassword,
    hasCredentials,
    initializeCredentials
};
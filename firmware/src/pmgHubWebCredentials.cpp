#include <pmgHubConfig.h>
#include <pmgHubWebCredentials.h>
#include <LittleFS.h>
#include <pmgHubServices.h>
#include <ArduinoJson.h>
#include <pmgHubCryptoManager.h>

using namespace pmgHub;

JsonDocument webCredentials::readCredentials() {

    if (!_services.getStorage().isDataReady()) return JsonDocument();

    File file = _services.getStorage().getDataFS().open("/credentials.json", "r");
    if (!file) {
        Serial.println("Failed to open credentials file for reading.");
        return JsonDocument();
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        Serial.println("Failed to parse credentials JSON.");
        doc.clear();
    }

    return doc;

};

bool webCredentials::hasCredentials() {
    JsonDocument doc = readCredentials();
    return (doc.is<JsonObject>() && doc.size() > 0);
};

bool webCredentials::isValidPassword(const String& password) {

    if (password.isEmpty()) return false;

    // if (password == emergencyPasswordAdmin) {
    //     resetCredentials();
    //     return true;
    // }

    const JsonDocument credentials = readCredentials();

    if (!credentials.is<JsonObject>() && credentials.size() == 0) return false;

    const String algorithm = credentials["algorithm"].as<String>();

    if (algorithm == "pbkdf2-sha256") {
                    
        const String salt = credentials["salt"].as<String>();
        const String expectedHash = credentials["hash"].as<String>();
        const uint32_t iterations = credentials["iterations"].as<uint32_t>();

        String computedHash;

        bool success = pmgHub::CryptoManager::hashPassword(password, salt, computedHash, iterations);

        if (success) return (computedHash == expectedHash);

    }
    
    return false;

};

bool webCredentials::initializeCredentials(const String& password) {
                
    if (hasCredentials()) return false;
    if (!_services.getStorage().isDataReady()) return false;

    // Save credentials
    String salt = pmgHub::CryptoManager::generateSalt();
    String hash;

    bool success = pmgHub::CryptoManager::hashPassword(password, salt, hash, pmgHub::config::PBKDF2_HMAC_SHA256_iterations);

    if (success) {
                    
        JsonDocument doc;

        doc["algorithm"] = "pbkdf2-sha256";
        doc["iterations"] = pmgHub::config::PBKDF2_HMAC_SHA256_iterations;
        doc["salt"] = salt;
        doc["hash"] = hash;

        Serial.println("Credentials initialized successfully.");

        File file = _services.getStorage().getDataFS().open("/credentials.json", "w");
        if (!file) {
            Serial.println("Failed to open credentials file for writing.");
            return false;
        }

        size_t bytesWritten = serializeJson(doc, file);
        file.close();

        if (bytesWritten == 0) {
            Serial.println("Error during JSON writing");
            return false;
        }

    } else {
        Serial.println("Failed to hash password.");
        return false;
    }

    return true;

};

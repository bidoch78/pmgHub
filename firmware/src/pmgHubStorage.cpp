#include <pmgHubStorage.h>
#include <LittleFS.h>

using namespace pmgHub;

storage::storage() {
    
    _webReady = _webFS.begin(false, "/web", 10, "web");
    if (!_webReady) {
        Serial.println("Failed to mount web filesystem");
    }

    _dataReady = _storageFS.begin(true, "/storage", 10, "storage");
    if (!_dataReady) {
        Serial.println("Failed to mount storage filesystem");
    }

}

fs::LittleFSFS& storage::getWebFS() { return _webFS; }
fs::LittleFSFS& storage::getDataFS() { return _dataFS; } 

bool storage::isWebReady() const { return _webReady; }
bool storage::isStorageReady() const { return _storageReady; }
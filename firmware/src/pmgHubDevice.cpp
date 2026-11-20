#include <pmgHubDevice.h>
#include <Arduino.h>
#include <pmgHubCryptoManager.h>

using namespace pmgHub;

device::device() {
    _uid = CryptoManager::generateUID();
};

device::device(String token) {
    _token = token;
    _uid = CryptoManager::generateUID();
};

const String& device::getUID() const { return _uid; };

void device::setMAC(const String mac) { _mac = mac; _mac.toLowerCase(); };
const String& device::getMAC() const { return _mac; };

bool device::isWebAdmin() { return _isWebAdmin; };
void device::setWebAdmin(bool admin) { _isWebAdmin = admin; };

bool device::isConnected() { return _connected; };
void device::setConnected(bool conn) { _connected = conn; }
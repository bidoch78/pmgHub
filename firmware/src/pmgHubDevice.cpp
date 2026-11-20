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

void device::setMAC(const String mac) { _mac = mac; };
const String& device::getMAC() const { return _mac; };

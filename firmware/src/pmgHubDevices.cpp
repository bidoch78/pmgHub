#include <pmgHubDevice.h>

using namespace pmgHub;

devices::devices() {
};

device& devices::registerWebAdmin(const String token) { 
    device nDev(token);
    auto [it, inserted] = _devices.emplace(nDev.getUID(), std::move(nDev));
    return it->second;
};

device& devices::registerDevice() {
    device nDev;
    auto [it, inserted] = _devices.emplace(nDev.getUID(), std::move(nDev));
    return it->second;
};
#include <pmgHubDevices.h>
#include <pmgHubDevice.h>

using namespace pmgHub;

devices::devices() {
};

device& devices::registerWebAdmin(const String token) { 
    device nDev(token);
    auto [it, inserted] = _devices.emplace(nDev.getUID(), std::move(nDev));
    device& mapDevice = it->second; 
    mapDevice.setServices(*_services);
    mapDevice.setWebAdmin(true);
    mapDevice.setConnected(true);
    return mapDevice;
};

device& devices::registerDevice() {
    device nDev;
    auto [it, inserted] = _devices.emplace(nDev.getUID(), std::move(nDev));
    device& mapDevice = it->second; 
    mapDevice.setServices(*_services);
    return mapDevice;
};
#include <pmgHubClientSessionManager.h>

using namespace pmgHub;

wsClientSessionManager::add(const webSocket& ws, const device& dv) {
    
    wsClientSession wsCS(ws, dv);
    _cSockets.emplace(dv.getUID(), std::move(wsCS));

};
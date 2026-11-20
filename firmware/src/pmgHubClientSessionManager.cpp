#include <pmgHubClientSessionManager.h>

using namespace pmgHub;

wsClientSession& wsClientSessionManager::add(const webSocket& ws, const device& dv) {
    wsClientSession wsCS(ws, dv);
    auto [it, inserted] = _cSockets.emplace(dv.getUID(), std::move(wsCS));
    return it->second;
};
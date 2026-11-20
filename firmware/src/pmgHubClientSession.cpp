#include <pmgHubClientSession.h>

using namespace pmgHub;

device& wsClientSession::getDevice() { return _device; }
webSocket& wsClientSession::getWebSocket() { return _ws; }
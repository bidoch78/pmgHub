#include <pmgHubClientSessionManager.h>
#include <ArduinoJson.h>

using namespace pmgHub;

wsClientSession& wsClientSessionManager::add(webSocket& ws, device& dv) {
    auto [it, inserted] = _cSockets.try_emplace(dv.getUID(), ws, dv, _pingInterval);

    ws.onMessage([this](int socketfd, const String& message) {
        
        cSocketData* socketData = getBySocketFD(socketfd);
        if (socketData == nullptr) return;
        
        String clientUID = socketData->clientSession.getDevice().getUID();

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, message.c_str(), message.length());
        
        if (error || !doc.is<JsonObject>() || !doc["type"].is<const char*>()) return;

        const char* type = doc["type"].as<const char*>();
        if (doc["type"] == "pong" && socketData->awaitingPong) {

            Serial.printf("Heartbeat receive pong from (%s)\n", clientUID.c_str());

            socketData->lastPong = millis();
            socketData->awaitingPong = false;
            socketData->pongDeadline = 0;
            socketData->nextPing = socketData->lastPong + _pingInterval;

        }
        
        socketData->createdAt = 0;

    });

    ws.onClose([this](int socketfd, int32_t code, const String& message) {

        cSocketData* socketData = getBySocketFD(socketfd);
        if (socketData == nullptr) return;

        String clientUID = socketData->clientSession.getDevice().getUID();

        Serial.printf("WSS Close (%s)\n", clientUID.c_str());
        remove(clientUID);

    });

    return it->second.clientSession;
};

bool wsClientSessionManager::close(const String& clientUID, uint32_t error, const String& message) {

    wsClientSession* clientSession = getById(clientUID);
    if (clientSession == nullptr) return false;

    device& dv = clientSession->getDevice();
    if (dv.isConnected()) clientSession->getWebSocket().close(error ? error : 4200, message != "" ? message : "device.reject");

    return true;
    
}

bool wsClientSessionManager::remove(const String& clientUID) {

    return true;
    
}

void wsClientSessionManager::checkHeartbeat() {



}

wsClientSession* wsClientSessionManager::getById(const String& clientUID) {

    auto it = _cSockets.find(clientUID);
    if (it == _cSockets.end()) return nullptr;
    return &it->second.clientSession;  

}

wsClientSessionManager::cSocketData* wsClientSessionManager::getBySocketFD(int socketfd) {

    for (auto& [uid, data] : _cSockets) {
        if (data.clientSession.getWebSocket().getSocketFd() == socketfd) return &data;
    }

    return nullptr;    

}

void wsClientSessionManager::broadcastToWebAdmin(const String& message) {

    for (auto& [uid, data] : _cSockets) {
        device& dv = data.clientSession.getDevice();
        if (dv.isWebAdmin() && dv.isConnected()) {
            data.clientSession.getWebSocket().send(message);
        }
    }

}

void wsClientSessionManager::sendToDevice(const String& clientUID, const String& message) {

    for (auto& [uid, data] : _cSockets) {
        device& dv = data.clientSession.getDevice();
        if (dv.getUID() == clientUID && dv.isConnected()) {
            data.clientSession.getWebSocket().send(message);
        }
    }    

}

uint32_t wsClientSessionManager::countSessions() { return _cSockets.size(); }
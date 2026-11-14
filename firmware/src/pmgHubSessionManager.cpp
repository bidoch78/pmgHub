#pragma once

#include <Arduino.h>
#include <map>
#include <pmgHubSessionManager.h>

using namespace pmgHub;

sessionManager::sessionManager(services& services, uint32_t timeoutMs = 60*60*1000, const String& storePath = "/sessions.json")
                                : _services(services), _timeoutMs(timeoutMs), _storePath(storePath) {

    //Load last sessions stored    
    loadSession();
};

void sessionManager::loadSession() {

};

void sessionManager::saveSessions() {

};

void sessionManager::cleanup(bool save = true) {
    
    uint32_t now = millis();
    uint32_t removedCount = 0;

    for (auto it = _sessions.begin(); it != _sessions.end(); ) {
        if (now - it->second.lastActivity > _timeoutMs) {
            it = _sessions.erase(it);
            removedCount++;
        } else {
            ++it;
        }
    }

    if (removedCount > 0 && save) saveSessions();

};

String sessionManager::create(sessionType session_type) {
    
    cleanup();

    //If number of sessions is greater than maxSessions, remove the oldest session based on the lastActivity timestamp
    if (_sessions.size() >= pmgHub::config::maxSessions) {
        
    }

    //Create a new session token and ensure it's unique
    String token;
    do {
        token = CryptoManager::generateToken();
    } while (!_sessions.emplace(token, sessionData(millis(), session_type)).second);

    return token;

};

bool sessionManager::isType(const String& token, sessionType session_type) {
    return getType(token) == session_type;
};

sessionType sessionManager::getType(const String& token) {
    auto it = _sessions.find(token);
    return it != _sessions.end() ? it->second.type : sessionType::unknown;
};

bool sessionManager::validate(const String& token) {
    auto it = _sessions.find(token);
    if (it != _sessions.end()) {

        uint32_t now = millis();

        if (now - it->second.lastActivity > _timeoutMs) {
            remove(token);
            return false;
        }

        it->second.lastActivity = now;
        return true;

    }
    return false;
};

bool sessionManager::remove(const String& token) {
    bool removed = _sessions.erase(token) > 0;
    saveSessions();
    return removed;
};

uint32_t sessionManager::countActiveSessions() { return _sessions.size(); };

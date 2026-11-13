#pragma once

#include <Arduino.h>
#include <map>
#include <pmgHubCryptoManager.h>

namespace pmgHub {

    class services;

    class sessionManager {

        public:

            enum class sessionType : uint32_t {
                unknown = 0,
                device = 1,
                webAdmin = 2
            };

        private:

            struct sessionData {
                uint32_t lastActivity;
                sessionType type;
                sessionData(uint32_t lActivity, sessionType sType): lastActivity(lActivity), type(sType) {};
            };

            services& _services;
            uint32_t _timeoutMs;
            String _storePath;
            std::map<String, sessionData> _sessions;

            void loadSession() {

            }

            void saveSessions() {

            }

            void cleanup(bool save = true) {
                
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

            }

        public:

            sessionManager(services& services, uint32_t timeoutMs = 60*60*1000, const String& storePath = "/sessions.json")
                : _services(services), _timeoutMs(timeoutMs), _storePath(storePath) {

                //Load last sessions stored    
                loadSession();
            }

            String create(sessionType session_type) {
                
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

            }

            bool isType(const String& token, sessionType session_type) {
                return getType(token) == session_type;
            }

            sessionType getType(const String& token) {
                auto it = _sessions.find(token);
                return it != _sessions.end() ? it->second.type : sessionType::unknown;
            }

            bool validate(const String& token) {
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
            }

            bool remove(const String& token) {
                bool removed = _sessions.erase(token) > 0;
                saveSessions();
                return removed;
            }

            uint32_t countActiveSessions() {
                return _sessions.size();
            }

    };

};
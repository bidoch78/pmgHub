#pragma once

#include <pmgHubServices.h>
#include <map>

namespace pmgHub {

    class SessionManager {

        public:

            enum class SessionType : uint32_t {
                device = 0,
                webAdmin = 1
            };

        private:

            struct SessionData {
                uint32_t lastActivity;
                SessionType type;
            }

            Services& _service;
            uint32_t _timeoutMs;
            String _storePath;
            std::map<String, SessionType> _sessions;

            void loadSession() {

            }

            void saveSessions() {

            }

            void cleanup(bool save = true) {
                
            }

        public:

            SessionManager(Services& services, uint32_t timeoutMs = 60*60*1000, const String& storePath = "/sessions.json") 
                : _services(services), _timeoutMs(timeoutMs), _storePath(storePath) {

                //Load last sessions stored    
                loadSessions();
            }

            String create(SessionType session_type) {
                return "";
            }

            bool isType(String& token, SessionType session_type) {
                return false;
            }

            SessionType getType(String& token) {
                return SessionType::webAdmin;
            }

            bool validate(String& token) {
                return false;
            }

            void remove(String& token) {

            }

            uint32_t countActiveSessions() {
                cleanup();
                return this._sessions.size();
            }

    };

};
#pragma once

#include <Arduino.h>
#include <map>

namespace pmgHub {

    class services;

    class sessionManager {

        public:

            enum class SessionType : uint32_t {
                device = 0,
                webAdmin = 1
            };

        private:

            struct SessionData {
                uint32_t lastActivity;
                SessionType type;
            };

            services& _services;
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

            sessionManager(services& services, uint32_t timeoutMs = 60*60*1000, const String& storePath = "/sessions.json")
                : _services(services), _timeoutMs(timeoutMs), _storePath(storePath) {

                //Load last sessions stored    
                loadSession();
            }

            String create(SessionType session_type) {
                return "";
            }

            bool isType(const String& token, SessionType session_type) {
                return false;
            }

            SessionType getType(const String& token) {
                return SessionType::webAdmin;
            }

            bool validate(const String& token) {
                return false;
            }

            void remove(const String& token) {

            }

            uint32_t countActiveSessions() {
                cleanup();
                return _sessions.size();
            }

    };

};
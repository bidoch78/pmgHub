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

            void loadSession();
            void saveSessions();
            void cleanup(bool save = true);

        public:

            sessionManager(services& services, uint32_t timeoutMs = 60*60*1000, const String& storePath = "/sessions.json");
       
            String create(sessionType session_type);

            bool isType(const String& token, sessionType session_type);
            sessionType getType(const String& token);

            bool validate(const String& token);

            bool remove(const String& token);
            
            uint32_t countActiveSessions();

    };

};
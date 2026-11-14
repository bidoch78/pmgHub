#pragma once

namespace pmgHub {

    class webAuth {

        private:

            fs::LittleFSFS _storageFS;
            sessionManager& _sessions;

        //     services& _services;
            
            void setSessionCookie(httpd_req_t* req, String& token, uint32_t maxAgeMs = pmgHub::config::sessionTimeoutMs) {
        //         String cookie = "session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + String(maxAgeMs/1000);
        //         _server.sendHeader("Set-Cookie", cookie);
            }

            void clearSessionCookie(httpd_req_t* req) {
        //         _server.sendHeader("Set-Cookie", "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
            }

            String getCookieData(const String& cookieHeader, const String& cookieName) {

                int32_t start = 0;

                while (start < cookieHeader.length()) {
                    
                    int32_t end = cookieHeader.indexOf(';', start);

                    if (end < 0) end = cookieHeader.length();

                    String part = cookieHeader.substring(start, end);
                    part.trim();

                    int32_t separator = part.indexOf('=');

                    if (separator >= 0) {

                        String name = part.substring(0, separator);
                        name.trim();

                        if (name == cookieName) {
                            String value = part.substring(separator + 1);
                            value.trim();
                            return value;
                        }
                    }

                    start = end + 1;

                }

                return "";

            }

        public:

            webAuth(sessionManager& sessions): _sessions(sessions) {

            }

            String getSessionToken(httpd_req_t* req) { return getCookieData(cookie, "session"); }

            bool isAuthenticated(httpd_req_t* req, sessionManager& sessions) {
        //         String token = getSessionToken();
        //         return sessions.validate(token);
            }

            sessionManager::sessionType getSessionTypeAuthenticated(httpd_req_t* req, sessionManager& sessions) { 
        //         String token = getSessionToken();
        //         if (!sessions.validate(token)) return sessionManager::sessionType::unknown;
        //         return sessions.getType(token);
            }

    };

};
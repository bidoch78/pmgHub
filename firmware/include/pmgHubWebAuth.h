#pragma once

#include <pmhHubServices.h>
#include <esp_http_server.h>

namespace pmgHub {

    class webAuth {

        private:

            // sessionManager& _sessions;
            services& _services;

        public:

            webAuth(services& svc): _services(svc) {}

            static String getCookieData(const String& cookieHeader, const String& cookieName);
            static String getCookieFromReq(httpd_req_t* req);

            void setSessionCookie(httpd_req_t* req, String& token, uint32_t maxAgeMs = pmgHub::config::sessionTimeoutMs);
            void clearSessionCookie(httpd_req_t* req);
        
            String getSessionToken(httpd_req_t* req);
            bool isAuthenticated(httpd_req_t* req);
            sessionManager::sessionType getSessionTypeAuthenticated(httpd_req_t* req);

    };

};
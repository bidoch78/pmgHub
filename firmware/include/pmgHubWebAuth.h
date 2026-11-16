#pragma once

#include <pmgHubConfig.h>
#include <pmgHubServices.h>
#include <esp_http_server.h>

namespace pmgHub {

    class webAuth {

        private:

            services& _services;

        public:

            webAuth(services& svc): _services(svc) {}
            ~webAuth() = default;

            static String getCookieData(const String& cookieHeader, const String& cookieName);
            static String getCookieFromReq(httpd_req_t* req);

            String setSessionCookie(String& token, uint32_t maxAgeMs = pmgHub::config::sessionTimeoutMs);
            String clearSessionCookie();
        
            String getSessionToken(httpd_req_t* req);
            bool isAuthenticated(httpd_req_t* req);
            sessionManager::sessionType getSessionTypeAuthenticated(httpd_req_t* req);

    };

};
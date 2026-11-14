#include <pmgHubWebAuth.h>

using namespace pmgHub;

void webAuth::setSessionCookie(httpd_req_t* req, String& token, uint32_t maxAgeMs) {
    String cookie = "session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + String(maxAgeMs/1000);
    httpd_resp_set_hdr(req, "Set-Cookie", cookie.c_str());
};

void webAuth::clearSessionCookie(httpd_req_t* req) {
    String cookie = "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
    httpd_resp_set_hdr(req, "Set-Cookie", cookie.c_str());
};

String webAuth::getSessionToken(httpd_req_t* req) { 
    return getCookieData(webAuth::getCookieFromReq(req), "session"); 
}

bool webAuth::isAuthenticated(httpd_req_t* req) {
    String token = getSessionToken(req);
    return _services.getSessions().validate(token);
};

sessionManager::sessionType webAuth::getSessionTypeAuthenticated(httpd_req_t* req) { 
    String token = getSessionToken(req);
    if (!_services.getSessions().validate(token)) return sessionManager::sessionType::unknown;
    return _services.getSessions().getType(token);
};

String webAuth::getCookieFromReq(httpd_req_t* req) {

    size_t len = httpd_req_get_hdr_value_len(req, "Cookie");

    if (len == 0) return "";

    char* buffer = new char[len + 1];
    if (!buffer) return "";

    if (httpd_req_get_hdr_value_str(req, "Cookie", buffer, len + 1) != ESP_OK) { delete[] buffer; return ""; }

    String cookies(buffer);
    delete[] buffer;

    return cookies;
}

String webAuth::getCookieData(const String& cookieHeader, const String& cookieName) {

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

};
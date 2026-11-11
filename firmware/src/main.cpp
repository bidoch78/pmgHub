#include <Arduino.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <WiFi.h>

namespace
{

constexpr char* WIFI_AP_SSID = "ilnyenapas";
constexpr char* WIFI_AP_PASSWORD = "bienvenueChezLesBidolis";

WebServer server(80);

const char *getContentType(const String &path)
{
    const int extensionStart = path.lastIndexOf('.') + 1;
    String extension = path.substring(extensionStart);
    extension.toLowerCase();

    if (extension == "html") return "text/html";
    if (extension == "css") return "text/css";
    if (extension == "js") return "application/javascript";
    if (extension == "json") return "application/json";
    if (extension == "svg") return "image/svg+xml";
    if (extension == "png") return "image/png";
    if (extension == "jpg" || extension == "jpeg") return "image/jpeg";
    if (extension == "ico") return "image/x-icon";
    if (extension == "woff") return "font/woff";
    if (extension == "woff2") return "font/woff2";
    return "application/octet-stream";
}

void handleFileRequest()
{
    String path = server.uri();

    if (path.indexOf("..") >= 0)
    {
        server.send(400, "text/plain", "Invalid path");
        return;
    }

    if (path == "/")
    {
        path = "/index.html";
    }

    File file = LittleFS.open(path, "r");
    if (!file || file.isDirectory())
    {
        if (file)
        {
            file.close();
        }
        server.send(404, "text/plain", "File not found");
        return;
    }

    server.streamFile(file, getContentType(path));
    file.close();
}

void startWebServer()
{
    if (!LittleFS.begin(false, "/littlefs", 10, "web"))
    {
        Serial.println("Failed to mount the web LittleFS partition");
        return;
    }

    server.onNotFound(handleFileRequest);
    server.begin();
    Serial.println("HTTP server started on port 80");
}
}

void setup()
{

    Serial.begin(115200);

    Serial.println("pmgHub started");
    Serial.printf("PSRAM total: %u", ESP.getPsramSize());
    Serial.printf("PSRAM free: %u", ESP.getFreePsram());

    WiFi.mode(WIFI_STA);
    if (!WiFi.begin(WIFI_AP_SSID, WIFI_AP_PASSWORD))
    {
        Serial.println("Failed to connect to Wi-Fi network");
        return;
    }

    while(WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.println("Connecting to Wi-Fi...");
    }

    Serial.printf("Open http://%s/ to access pmgHub\n", WiFi.localIP().toString().c_str());

    startWebServer();
}

void loop()
{
    server.handleClient();
}

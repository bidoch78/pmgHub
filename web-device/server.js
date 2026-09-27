const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT || 3001);
const defaultHubUrl = process.env.BROWSER_HUB_URL || "http://localhost:3000";
const webRoot = path.join(__dirname, "web");
const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}

function serveFile(res, filename) {
    const filePath = path.join(webRoot, filename);
    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(error.code === "ENOENT" ? 404 : 500);
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/config" && req.method === "GET") {
        sendJson(res, 200, { defaultHubUrl });
        return;
    }

    if (url.pathname === "/" && req.method === "GET") {
        serveFile(res, "index.html");
        return;
    }
    if (["/app.js", "/style.css"].includes(url.pathname) && req.method === "GET") {
        serveFile(res, url.pathname.slice(1));
        return;
    }

    sendJson(res, 404, { error: "Not found." });
});

server.listen(port, "0.0.0.0", () => {
    console.log(`pmgDevice Simulator listening on http://localhost:${port}`);
    console.log(`Default pmgHub URL: ${defaultHubUrl}`);
});

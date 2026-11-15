#include <pmgHubWebSocket.h>
#include <algorithm>
#include <cstring>

using namespace pmgHub;

webSocket::webSocket(httpd_handle_t server, int32_t socketfd) : 
    _server(server), _socketfd(socketfd), _state(state::OPEN) { 
};

int32_t webSocket::getSocketFd() const { return _socketfd; }

bool webSocket::isConnected() const { return _state == state::OPEN; };

webSocket::state webSocket::getReadyState() const { return _state; };

void webSocket::attach(httpd_handle_t server, int socketfd) {
    _server = server;
    _socketfd = socketfd;
    _state = state::OPEN;
};

esp_err_t webSocket::send(const String& message) {

    if (_state != state::OPEN || _server == nullptr || _socketfd < 0) return ESP_ERR_INVALID_STATE;

    httpd_ws_frame_t frame = {};

    frame.type = HTTPD_WS_TYPE_TEXT;
    frame.payload = reinterpret_cast<uint8_t *>(
        const_cast<char *>(message.c_str())
    );
    frame.len = message.length();

    return httpd_ws_send_frame_async(_server, _socketfd, &frame);

};

esp_err_t webSocket::close(uint16_t code, const String& reason) {

    if (_state != state::OPEN || _server == nullptr || _socketfd < 0) return ESP_ERR_INVALID_STATE;

    /*
     * Control Frame 125 octets.
     *
     * CLOSE payload :
     * - 2 octets for the code error
     * - max 123 octets for reason
     */
    constexpr size_t MAX_CLOSE_PAYLOAD = 125;
    constexpr size_t MAX_REASON_LENGTH = 123;

    const size_t reasonLength = std::min(reason.length(), MAX_REASON_LENGTH);

    uint8_t payload[MAX_CLOSE_PAYLOAD];

    // Thx IA ;-)
    payload[0] = static_cast<uint8_t>((code >> 8) & 0xFF);
    payload[1] = static_cast<uint8_t>(code & 0xFF);

    if (reasonLength > 0) memcpy(payload + 2, reason.c_str(), reasonLength);

    httpd_ws_frame_t frame = {};

    frame.type = HTTPD_WS_TYPE_CLOSE;
    frame.payload = payload;
    frame.len = 2 + reasonLength;

    _state = state::CLOSING;

    /* send the closing frame (apparently it's not really async) */
    esp_err_t err = httpd_ws_send_frame_async(_server, _socketfd, &frame);

    if (err != ESP_OK) {
        _state = state::OPEN;
        return err;
    }

    /*
     * Closing frame has been sent now we can close the socket
     */
    err = httpd_sess_trigger_close(_server, _socketfd);

    if (err != ESP_OK) return err;

    return ESP_OK;

};

void webSocket::onMessage(MessageCallback callback) {
    _messageCallback = callback;
};

void webSocket::onClose(CloseCallback callback) {
    _closeCallback = callback;
};

void webSocket::dispatchMessage(const String& message) {
    if (_messageCallback) _messageCallback(message);  
};

void webSocket::dispatchClose(int32_t code, const String& reason) {

    _socketfd = -1;
    _server = nullptr;
    _state = state::CLOSED;

     if (_closeCallback) _closeCallback(code, reason);

};
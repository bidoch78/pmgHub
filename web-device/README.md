# pmgDevice Simulator

A standalone web application that simulates pmgDevice ESP32 displays and pairs them with the pmgHub simulator over WebSocket.

## Run with Docker Compose

Start pmgHub first, then from this directory run the device simulator using its dedicated Compose file. Open `http://localhost:3001`.

The default hub URL is `http://localhost:3000` because the browser page opens the WebSocket directly to pmgHub. If the hub is hosted elsewhere, set `PMGHUB_BROWSER_URL` before starting the Compose project, or change the Hub URL field in the page.

## Run with Node.js

From this directory:

```sh
npm install
BROWSER_HUB_URL=http://localhost:3000 npm start
```

On PowerShell, set `$env:BROWSER_HUB_URL = 'http://localhost:3000'` before `npm start`.

Open `http://localhost:3001`. The Hub URL field can also be edited in the page.

Run the pairing integration test from this directory with `npm test` after installing dependencies.

## Pairing flow

1. Create the single simulated device. Its locally administered MAC address is generated in the browser, or enter an existing MAC address to simulate known hardware. An optional 64-character hexadecimal token can also be entered. The MAC and token exist only in the current page's memory; web-device has no API that reads or writes them.
2. The browser page opens the WebSocket directly to pmgHub and sends its MAC with the saved token, or an empty token if it has not yet been paired.
3. The hub validates the token. A valid token authenticates the device immediately. A missing or invalid token puts the device in **Pairing requests** for approval.
4. When approved, the hub creates a cryptographically random token and sends it over that WebSocket. The browser saves it locally, authenticates, and begins receiving sensor updates over the same WebSocket.
5. The hub stores the same token in `../data/paired-devices.json`; the paired device's live status is shown on the hub dashboard.

Closing or reloading the browser page closes its WebSocket, so pmgHub marks the device disconnected. The next page load starts with no simulated device and no saved MAC, token, or hub URL: create the device again and enter its MAC/token if you want to simulate that hardware reconnecting. While the page remains open, **Reconnect** can retry a dropped socket. No `/api/devices` endpoint is provided by web-device, so its server cannot be queried to list or retrieve tokens.

The pairing token is displayed in the simulator for reconnect testing, but is discarded when the page closes or reloads. The hub's device-list APIs never return tokens.

Authenticated pmgDevices receive categorized sensor records containing a stable ID, category, name, numeric value/unit, input voltage, and `error`/`alarm` booleans. The device simulator displays these records from the WebSocket stream.

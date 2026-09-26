# pmgDevice Simulator

A standalone web application that simulates pmgDevice ESP32 displays and pairs them with the pmgHub simulator over WebSocket.

## Run with Docker Compose

Start pmgHub first, then from this directory run the device simulator using its dedicated Compose file. Open `http://localhost:3001`.

The default hub URL in Docker is `http://host.docker.internal:3000`, which reaches a hub container published on port 3000. If the hub is hosted elsewhere, set `PMGHUB_URL` before starting the Compose project, or change the Hub URL field in the page.

## Run with Node.js

From this directory:

```sh
npm install
HUB_URL=http://localhost:3000 npm start
```

On PowerShell, set `$env:HUB_URL = 'http://localhost:3000'` before `npm start`.

Open `http://localhost:3001`. The Hub URL field can also be edited in the page.

Run the pairing integration test from this directory with `npm test` after installing dependencies.

## Pairing flow

1. Create a device. Its locally administered MAC address is generated automatically and stored in `data/devices.json`.
2. Select **Pair with hub**. The device simulator opens a WebSocket to the hub and sends a pairing request containing its MAC address and name.
3. In the pmgHub dashboard, approve the request under **Pairing requests**.
4. The hub creates a cryptographically random token and sends it over that WebSocket. The device simulator stores the token in its JSON file and reconnects using token authentication.
5. The hub stores the same token in `../data/paired-devices.json`; the paired device's live status is shown on the hub dashboard.

Tokens are not returned by the device or hub list APIs. Both JSON files contain credentials and should be treated as sensitive local simulator data.

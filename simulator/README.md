# pmghub Simulator

Node.js simulator for the future pmghub ESP32.

## Expected structure

The `simulator/` directory must be placed next to the `web/` directory:

```
pmghub/
├── web/
└── simulator/
```

## Installation

From `simulator/`:

```bash
npm install
npm start
```

Then open:

`http://localhost:3000`

Development credentials:

- username: `admin`
- password: `vehiclecore`

They can be configured in `config.js`.

## API shared with the ESP32

- `POST /api/login`
- `POST /api/logout`
- `GET /api/sensors`
- `GET /api/devices`
- `GET /api/status`
- WebSocket: `/ws`

## Device pairing simulator API

These authenticated dashboard endpoints handle device approval:

- `GET /api/pairing/requests`
- `POST /api/devices/:mac/approve`
- `POST /api/pairing/requests/:mac/reject`
- `DELETE /api/devices/:mac` to revoke a paired device

The pmgDevice simulator connects to `/ws/device`. It sends a `pairing.request` message with its MAC address and name. Once approved, the hub sends a one-time `pairing.approved` message containing the generated token. The device reconnects with `device.authenticate`; the hub stores the token in `data/paired-devices.json` and updates the device's connection status.

## Simulator-only routes

`POST /simulator/scenario`

Example JSON:

```json
{
  "scenario": "acceleration"
}
```

Available scenarios:

- `engineOff`
- `idle`
- `cruise`
- `acceleration`
- `lowOilPressure`
- `overheat`

These routes are intended for testing only and are not meant to be implemented on the ESP32.

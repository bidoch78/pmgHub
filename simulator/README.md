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

On first start, the login page asks you to set a password. The password is stored as a scrypt hash in `credentials.json`; legacy credential files containing a username and plaintext password are accepted once and migrated to the password-only hash format after successful login.

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

The pmgDevice browser simulator opens its own connection to `/ws/device` and sends `device.connect` with its MAC and saved token (or an empty token). A valid token authenticates immediately; a missing or invalid token creates a pending request. Once approved, the hub sends `pairing.approved` with a new token, and the browser replies with `device.authenticate`. Authenticated devices receive `sensor.update` messages on that WebSocket. The hub stores tokens in `data/paired-devices.json` and updates connection status when the page's WebSocket opens or closes.

## Sensor payload

`GET /api/sensors`, the dashboard `/ws` stream, and authenticated pmgDevice `sensor.update` messages share this shape:

```json
{
  "scenario": "idle",
  "sensors": [
    {
      "id": "engine.rpm",
      "category": "ENGINE",
      "name": "Engine speed",
      "value": 850.0,
      "unit": "rpm",
      "voltage": 0.925,
      "error": false,
      "alarm": false
    }
  ]
}
```

Sensor IDs are stable and unique. Values and voltages are numeric; `voltage` is the simulated raw input in volts. `error` marks a failed reading and `alarm` is the signal pmgDevice can use to react. The `sensorError` simulator scenario exercises the error flag.

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
- `sensorError`

These routes are intended for testing only and are not meant to be implemented on the ESP32.

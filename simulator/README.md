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
- `GET /api/status`
- WebSocket: `/ws`

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

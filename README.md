# pmgHub
Pimp My Gauge - Hub

## Simulators

- pmgHub web simulator: see `simulator/README.md` (port 3000).
- pmgDevice web simulator: see `web-device/README.md` (port 3001 and its own Docker Compose file).

The pmgDevice simulator connects to the hub over `/ws/device`. Pairing requests are approved from the pmgHub dashboard; the generated token is stored on both simulator sides in their respective local JSON data files.

# apps/server

Node + TypeScript WebSocket hub for the household (`ws://<LAN IP>:8787/ws`). In memory for now; DynamoDB, S3 and Bedrock land in later steps.

- `src/hub.ts`: pairing codes, the TV claim + TV token, session tokens, payload validation, topic routing. Each frame is handled inside a try/catch.
- `src/index.ts`: HTTP (`/health`) + `ws`, listens on `0.0.0.0`, prints the LAN URLs it detected.
- Protocol: [`packages/shared/src/protocol.ts`](../../packages/shared/src/protocol.ts). Flow: [architecture › Pairing](../../docs/architecture/architecture.md#5-server).

```bash
npm run dev -w @huddle/server     # tsx watch
npm test -w @huddle/server        # node:test against a real ws server on a random port
```

| Env | Default |
|---|---|
| `PORT` / `HOST` | `8787` / `0.0.0.0` |
| `HUDDLE_LAN_IP` | detected (en* interfaces first) |
| `COMPANION_URL` | `http://<LAN IP>:5173/` (the QR encodes this + `?h=&c=`) |
| `HUDDLE_PLACE` / `HUDDLE_LAT` / `HUDDLE_LON` | `Toronto` / `43.65` / `-79.38` (Open-Meteo, no key) |
| `HUDDLE_WEATHER` | on; `off` skips the poller (offline demos) |
| `TZ` | system. Demo calendar events are placed in server-local time, so set it on a hosted box |

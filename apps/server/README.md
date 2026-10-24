# apps/server

Node + TypeScript WebSocket hub for the household (`ws://<LAN IP>:8787/ws`). Household and league state are in memory; a restart clears them. Tonight picks, phone chat and Watched It questions go through Amazon Bedrock (Nova) or a deterministic mock. DynamoDB, S3, Polly and Transcribe are not used.

- `src/hub.ts`: pairing codes, the TV claim + TV token, session tokens, payload validation, topic routing. Each frame is handled inside a try/catch.
- `src/ai/`: `HouseholdAI` interface, `BedrockAI` (Converse / ConverseStream), `MockAI` (deterministic, no AWS). The hub falls back to the mock when Bedrock fails.
- `src/index.ts`: HTTP (`/health`) + `ws`, listens on `0.0.0.0`, prints the LAN URLs it detected.
- Protocol: [`packages/shared/src/protocol.ts`](../../packages/shared/src/protocol.ts). Flow: [architecture › Pairing](../../docs/architecture/architecture.md#5-server).

```bash
cp apps/server/.env.example apps/server/.env   # optional; dev/start load it if present
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
| `HUDDLE_AI` | `mock`; `bedrock` calls Amazon Nova with the default AWS credential chain (`AWS_PROFILE`, `aws login`, env keys) |
| `AWS_REGION` | `us-east-1` (a region with Nova cross-region inference profiles) |
| `HUDDLE_TONIGHT_MODEL` / `HUDDLE_CHAT_MODEL` / `HUDDLE_QUIZ_MODEL` | `us.amazon.nova-lite-v1:0` / `us.amazon.nova-micro-v1:0` / `us.amazon.nova-pro-v1:0` (the quiz also runs a second, cold pass and keeps only questions both passes agree on) |
| `TZ` | system. Demo calendar events are placed in server-local time, so set it on a hosted box |
| `TMDB_API_KEY` | unset. v3 key for Tonight posters (`/search/movie`). Cached in memory. Mock and Bedrock picks both get art when this or the token below is set |
| `TMDB_READ_TOKEN` | unset. v4 read access token, used when `TMDB_API_KEY` is empty. Sent as `Authorization: Bearer` |

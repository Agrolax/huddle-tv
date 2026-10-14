# Architecture

## 1. Overview

```
┌──────────────────────────────┐   HTTPS + WebSocket   ┌────────────────────────────────┐
│ Fire TV app  (apps/tv)        │◄────────────────────►│ Huddle API  (apps/server)       │
│ React Native for Vega OS     │                       │ Node + TypeScript               │
│ - profile picker, home, widgets│                      │ - households, profiles          │
│ - focus/D-pad system           │                      │ - board, events, photos         │
│ - launches other apps (deep    │                      │ - launch log → patterns         │
│   links via Linking)           │                      │ - realtime push (WebSocket)     │
│ - ambient mode                 │                      │                                 │
└──────────────────────────────┘                       │  ┌──────── AWS ───────────┐     │
                                                       │  │ Bedrock: Tonight picks, │     │
┌──────────────────────────────┐   HTTPS + WebSocket   │  │   daily brief, NL→event │     │
│ Phone companion (apps/companion)◄───────────────────►│  │ Polly: TV voice (TTS)   │     │
│  │ Transcribe: phone voice │     │
│  │ DynamoDB: household data│     │
│ React + Vite, mobile web       │                      │  │ S3: photos              │     │
│ opened via QR                  │                      │  └─────────────────────────┘     │
└──────────────────────────────┘                       │  External: weather, watch        │
                                                       │  providers, sports scores        │
                                                       └────────────────────────────────┘
```

**The hub.** One household on the server. Clients join with a role:
- **`tv`**: the Fire TV app (Vega, `apps/tv`). It is the main screen.
- **`phone`**: the companion web app, opened from the QR code. It is the keyboard, the chat box and the Sketch it pen.
- **`display`** (later): a second screen that mostly reads, such as an Echo Show via an Alexa skill that opens our web page. See [echo-show.md](../research/echo-show.md).
- **`voice`** (stretch): an Alexa skill backend.

**Principles**
- The **server is the source of truth**. The TV, phones, and Alexa are views that subscribe to household updates.
- The TV app must **work offline-ish**: cache the last household state so the home screen renders instantly.
- AI calls are **never on the critical path** of rendering home. Precompute the brief; show "Tonight" behind a loading state.

## 2. Repo layout

npm workspaces. `npm run check` typechecks every workspace and runs all unit tests. Workspace packages ship TypeScript source (`main: src/index.ts`): Metro (TV), Vite (companion) and tsx (server) compile them directly, so there's no build step.

| Path | Stack | Purpose |
|---|---|---|
| `apps/tv` | React Native for Vega (SDK 0.24, RN 0.72) | TV app |
| `apps/companion` | React + Vite + TS | Phone web app |
| `apps/server` | Node + TS (Fastify + `ws`) | API, realtime, AI orchestration |
| `packages/shared` | TS | Types (events, models), theme tokens |
| `packages/tv-focus-kit` | TS / RN | Candidate open-source package |

## 3. TV app

- **Base:** the Vega app in `react-native-multi-tv-app-sample`. Its web target is handy for fast design iteration in a browser. Stay on that sample's React Native version (0.72 until its 0.83 migration lands). SDK 0.24 can scaffold a new app on React Native 0.83, and several Expo libraries are not stabilized there yet.
- **Navigation:** Amazon's react-navigation packages (skill: `amazon-devices-vega-navigation`)
- **Focus:** `@huddle/tv-focus-kit`. `FocusGrid` computes each neighbour in plain TS (`grid.ts`, unit tested) and sets `nextFocus*` on Vega's `Pressable`. Edges fall back to native Cartesian focus. Grids sit inside `TVFocusGuideView autoFocus` so focus coming back from outside lands on the last cell. Verified on the VVD in step 1.
- **Widgets:** each widget is a module with:
  ```ts
  interface Widget {
    id: string;              // 'clock' | 'calendar' | 'profiles' | 'tonight' | 'sketch' | 'smart-home'
    Tile: React.FC<{ size: 'S' | 'M' | 'L'; focused: boolean }>;
    Expanded: React.FC;      // full-screen view on Select
    dataKey: string;         // which household slice it subscribes to
  }
  ```
  Step 1 has the tiles only (`FocusGridItem.render` + `WidgetTile` chrome). Expanded views come with each widget's step.

## 4. App launching

**The TV app targets Vega OS.** Vega has no Android `PackageManager`, so Huddle does not scan the device for installed apps. The phone companion stores which services the household has. The TV opens them with React Native `Linking`:

```ts
const supported = await Linking.canOpenURL(url);
if (supported) await Linking.openURL(url);
```

URI shapes Vega accepts ([deep links](https://developer.amazon.com/docs/vega/0.22/deep-links-vega-apps.html), [Linking](https://developer.amazon.com/docs/react-native-vega/0.72/linking.html)):

| Kind | Example | Use |
|---|---|---|
| Custom scheme | `netflix://…` | Open an app, or a title when that app publishes a scheme |
| https | `https://www.netflix.com/title/…` | Title pages some apps claim |
| App identifier | `amzns://apps?asin=B00…` | Open an Appstore app by ASIN |
| Appstore fallback | same `amzns://` form | App missing → its store page |

`@amazon-devices/kepler-media-content-launcher` is the API a media app implements so Fire TV can launch *into that app*. Huddle is the caller, so `Linking` is the path. Use Content Launcher only if the Day-1 spike shows a title handoff requires it.

**Spike results (fill in on Day 1):**

| App | Open app | Open specific title | URI used | Works on VVD? |
|---|---|---|---|---|
| Netflix | | | | |
| Prime Video | | | | |
| YouTube | | | | |
| Disney+ | | | | |
| Crave | | | | |
| Spotify | | | | |

Launch flow: `canOpenURL(titleUri)` → open title; else `canOpenURL(appUri)` → open app; else show "Not installed: get it from the Appstore". Log every launch (`profileIds`, `appId`, `hour`, `weekday`) to the server.

## 5. Server

- **Realtime:** one WebSocket channel per household; events below.
- **Storage (DynamoDB, single table):**
  | PK | SK | Item |
  |---|---|---|
  | `HH#<id>` | `META` | household name, pairing code, services owned |
  | `HH#<id>` | `PROFILE#<id>` | name, avatar, colour, teams |
  | `HH#<id>` | `NOTE#<ts>` | board note, author, expiry |
  | `HH#<id>` | `EVENT#<date>#<id>` | agenda item |
  | `HH#<id>` | `PHOTO#<ts>` | S3 key |
  | `HH#<id>` | `LAUNCH#<ts>` | app launch log |
- **Pairing (step 2, built):**
  1. The TV says `hello` as `tv` for its household (`HOUSEHOLD_ID`, default `home`). The **first TV claims the household** and gets a TV token in `welcome`, which it keeps in AsyncStorage. After that, only a TV holding that token may connect as `tv` (`tv-claimed` otherwise). A reconnecting TV replaces its old socket.
  2. "Connect phone" → `pair:request` → `pair:code {code, expiresAt, joinUrl}`. Codes are 6 characters from an unambiguous alphabet, live 10 minutes and can be reused within that window. The TV asks for a new one 30 s before expiry. `joinUrl` = `COMPANION_URL?h=<householdId>&c=<code>`, and that's what the QR encodes.
  3. A phone or display must send a valid, unexpired `pairCode` in `hello` (`pairing-required` / `pair-code-invalid` / `pair-code-expired` otherwise, then the socket closes). Its `welcome` carries a session token, so reconnects work after the code expires.
  4. Every inbound payload is shape-checked (`packages/shared/src/validate.ts`) before a handler runs. Bad frames get an `error` reply with `replyTo`. Each frame is handled inside a try/catch, so one bad frame can't crash the process. Frames over 16 KB are refused.
- No accounts: the household code + tokens are the whole auth model for the hackathon.

### Realtime protocol
Source of truth: [`packages/shared/src/protocol.ts`](../../packages/shared/src/protocol.ts) (types + routing tables, unit tested).

- Envelope: `{v: 1, id, ts, type, payload}`. `parseEnvelope` rejects anything else.
- Handshake: client → `hello {householdId, client: {clientId, role, label?, profileId?}, capabilities, topics, pairCode?}`. Server → `welcome {snapshot, you}`.
- Routing: each server message belongs to a topic (`SERVER_MESSAGE_TOPIC`). A client only gets the topics it subscribed to. `DEFAULT_TOPICS` per role.
- Permissions: `CLIENT_MESSAGE_ROLES`. The server answers anything else with `error {code: 'forbidden'}`.

| Client → server | Who | Server → clients | Topic |
|---|---|---|---|
| `profile:switch` | tv, phone, voice | `profile:changed` | household |
| `message:send` | phone, voice | `message:new` | messages |
| `chat:ask` | phone, voice, tv | `chat:reply` (streamed, `done`) | chat |
| `tonight:request` | tv, phone, voice | `tonight:picks` | tonight |
| `sketch:start` / `sketch:stroke` / `sketch:clear` / `sketch:guess` | tv+phone / phone / phone / phone+voice | `sketch:state` (prompt only to the drawer), `sketch:stroke`, `sketch:clear`, `sketch:guess` | sketch |
| `smart-home:set` | tv, phone, voice | `smart-home:state` | smart-home |
| — | | `calendar:updated` | calendar |
| `pair:request` | tv | `pair:code` (to that TV only) | — |
| `subscribe`, `ping` | all | `pong`, `error`, `client:joined/left` | — / household |

## 6. AI features (Bedrock)

| Feature | Input | Output (JSON) | When |
|---|---|---|---|
| **Tonight picker** | profiles present (ages, likes), mood, services owned, recent picks | `[{ title, year, why, service, deepLink? }]` | On demand |
| **Daily brief** | agenda, board, weather, sports | `{ greeting, lines[] }` per profile | Precomputed hourly / on change |
| **NL → event** | "dentist Thursday 4pm for Ammu" | `{ title, start, profileIds }` | Phone input |
| **Pattern phrasing** | launch stats | `"Saturday mornings are YouTube Kids time"` | Precomputed |

- **Model choice:** start with **Amazon Nova** (Lite/Micro) on Bedrock: first-party, cheap, definitely covered by credits. Third-party models (e.g. Claude) on Bedrock may be billed via AWS Marketplace, which promotional credits often don't cover, so check the Billing console after one test call before relying on them.
- Validate every response with `zod`; retry once on invalid JSON.
- Watch-provider availability: AI suggests titles, then **verify availability with a data source** (e.g. TMDB watch providers for region CA, which requires attribution). Never trust the model for "it's on Netflix".
- Stretch: wrap these as a Strands agent with tools (`get_agenda`, `get_launch_stats`, `search_titles`), which makes for a stronger AWS Builder story.

### Voice (Polly + Transcribe)
- **Polly (TTS):** server synthesizes short lines (brief, announcements) with a neural voice → caches MP3 in S3 keyed by text hash → sends the URL to the TV, which plays it. Precompute the daily brief audio together with its text.
- **Transcribe (speech-to-text):** phone companion records with `MediaRecorder` (hold-to-talk), streams audio over the existing WebSocket to the server, server uses **Transcribe streaming** → final text goes through the same Bedrock NL parser as typed input. Show the live transcript on the phone.
- Both are covered by the AWS credits; keep clips short (a few seconds) so costs stay at cents.

## 7. External data
| Need | Option | Key? |
|---|---|---|
| Weather | Open-Meteo | No |
| Titles + where to watch | TMDB API (watch/providers) | Free key, attribution |
| Sports scores | TheSportsDB or similar | Free tier |

## 8. Hosting
- Dev: server on laptop + tunnel (cloudflared / ngrok) so the stick and phone reach it.
- Demo: **Lightsail** instance (cheapest; WebSockets fine) or EC2, plus DynamoDB and S3, in one region with Bedrock access. Covered by the $250 credits.
- Companion served as static files from the server.
- Secrets in `.env` (gitignored); `.env.example` committed.

## 9. Open questions
- ~~Vega or Fire OS?~~ **Vega OS** (Oct 7). Demo on the Vega Virtual Device. The Stick HD on Fire OS 8 cannot run this build.
- ~~Echo app?~~ **No Vega app.** Echo devices run Vega, but there's no third-party app path. An Echo Show can join later as a `display` client through an Alexa skill + `Alexa.Presentation.HTML` ([echo-show.md](../research/echo-show.md)).
- Which streaming apps support title-level deep links on this device? (spike)
- Can `react-native-multi-tv-app-sample`'s web target share the same focus code? (matters for fast design iteration)

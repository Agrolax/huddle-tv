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

**The hub.** One household on the server. Three clients:
- **Fire TV app** (Vega, `apps/tv`) is the screen.
- **Phone web app** is the keyboard and the camera.
- **Echo** (Dot Max, Show 8) is the voice. Those devices run Vega OS, and Amazon's Vega app tooling targets Fire TV, so the Echo reaches the household through Alexa (a custom skill or the Huddle MCP), not by installing this app. Echo Dot Max has no screen to design.

**Principles**
- The **server is the source of truth**. The TV, phones, and Alexa are views that subscribe to household updates.
- The TV app must **work offline-ish**: cache the last household state so the home screen renders instantly.
- AI calls are **never on the critical path** of rendering home. Precompute the brief; show "Tonight" behind a loading state.

## 2. Repo layout

| Path | Stack | Purpose |
|---|---|---|
| `apps/tv` | React Native (start from `react-native-multi-tv-app-sample`) | TV app |
| `apps/companion` | React + Vite + TS | Phone web app |
| `apps/server` | Node + TS (Fastify + `ws`) | API, realtime, AI orchestration |
| `packages/shared` | TS | Types (events, models), theme tokens |
| `packages/tv-focus-kit` | TS / RN | Candidate open-source package |

## 3. TV app

- **Base:** the Vega app in `react-native-multi-tv-app-sample`. Its web target is handy for fast design iteration in a browser. Stay on that sample's React Native version (0.72 until its 0.83 migration lands). SDK 0.24 can scaffold a new app on React Native 0.83, and several Expo libraries are not stabilized there yet.
- **Navigation:** Amazon's react-navigation packages (skill: `amazon-devices-vega-navigation`)
- **Focus:** `TVFocusGuideView` / FocusManager (skill: `amazon-devices-vega-focus-management`); reference `vega-tv-interfaces-sample`
- **Widgets:** each widget is a module with:
  ```ts
  interface Widget {
    id: string;              // 'board' | 'agenda' | 'weather' | 'photos' | 'sports'
    Tile: React.FC<{ size: 'S' | 'M' | 'L'; focused: boolean }>;
    Expanded: React.FC;      // full-screen view on Select
    dataKey: string;         // which household slice it subscribes to
  }
  ```
- **Idle timer** → ambient mode; any key press exits.

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
- **Pairing:** TV creates household → 6-char code + QR (`https://<host>/h/<code>`) → phone joins. No accounts; a PIN gates settings.

### Realtime events (draft)
| Direction | Event | Payload |
|---|---|---|
| S → clients | `household:state` | full snapshot on connect |
| Phone → S | `note:create` | `{ text, authorId, expiresAt? }` |
| Phone → S | `event:create` | `{ text }` (NL) or structured |
| Phone → S | `photo:uploaded` | `{ s3Key }` |
| TV → S | `presence:set` | `{ profileIds[] }` |
| TV → S | `launch:log` | `{ appId, profileIds[] }` |
| S → clients | `note:created` / `event:created` / `photo:added` | item |

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
- ~~Echo app?~~ **No.** Echo Dot Max and Echo Show 8 run Vega, and third-party Echo work goes through Alexa. Phase 3 is a voice client of the same API.
- Which streaming apps support title-level deep links on this device? (spike)
- Can `react-native-multi-tv-app-sample`'s web target share the same focus code? (matters for fast design iteration)

# Architecture

## 1. Overview

```
┌──────────────────────────────┐   HTTPS + WebSocket   ┌────────────────────────────────┐
│ Fire TV app  (apps/tv)        │◄────────────────────►│ Huddle API  (apps/server)       │
│ React Native (Vega / Fire OS) │                       │ Node + TypeScript               │
│ - profile picker, home, widgets│                      │ - households, profiles          │
│ - focus/D-pad system           │                      │ - board, events, photos         │
│ - launches other apps (deep    │                      │ - launch log → patterns         │
│   links via Linking/intents)   │                      │ - realtime push (WebSocket)     │
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

**Principles**
- The **server is the source of truth**. The TV and phones are views that subscribe to household updates.
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

- **Base:** `react-native-multi-tv-app-sample` (one codebase for Vega, Android TV/Fire OS, web). The web target is handy for fast design iteration in a browser.
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

**Our device is Fire OS 8 (Android 11 based)**, so the Fire OS row is the primary path. A small native module (Kotlin) exposes:
- `getInstalledApps()`: `PackageManager.queryIntentActivities` for `CATEGORY_LEANBACK_LAUNCHER` (+ `CATEGORY_LAUNCHER`) → name, package, banner/icon. Needs `<queries>` entries (or `QUERY_ALL_PACKAGES`) because of Android 11 package visibility.
- `launchApp(package)`: `getLeanbackLaunchIntentForPackage` → `startActivity`
- `openUri(uri, package?)`: `ACTION_VIEW` intent, optionally targeted at a package (title deep links)


| OS | API | Notes |
|---|---|---|
| Vega | `Linking.canOpenURL(url)` → `Linking.openURL(url)` | App-to-app deep links via Vega Messaging; supports custom URIs, https, and limited Fire OS intent-style URIs. [Docs](https://developer.amazon.com/docs/vega/0.22/deep-links-vega-apps.html) |
| Fire OS | Android intents (`ACTION_VIEW` with URI, or launch intent by package) | Via RN `Linking` or a small native module |
| Both | Appstore deep link fallback | If the app isn't installed, open its Appstore page |

**Spike results (fill in on Day 1):**

| App | Open app | Open specific title | URI used | Works on my stick? |
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
- Demo: **Lightsail** instance (cheapest; WebSockets fine) or EC2, plus DynamoDB and S3, in one region with Bedrock access. All covered by the $100 credits.
- Companion served as static files from the server.
- Secrets in `.env` (gitignored); `.env.example` committed.

## 9. Open questions
- ~~Vega or Fire OS?~~ **Fire OS 8.** Native module in Kotlin for app listing/launching.
- Which streaming apps support title-level deep links on this device? (spike)
- Can `react-native-multi-tv-app-sample`'s web target share the same focus code? (matters for fast design iteration)

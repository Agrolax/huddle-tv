# Huddle — PRD

> AI-hosted party games for the living room. The TV is the stage, everyone's phone is the controller.

| | |
|---|---|
| **Hackathon** | Build, Ship, Shape: Amazon Developer Hackathon |
| **Deadline** | Oct 23, 2026 · 3:00pm EDT (aim to submit Oct 22) |
| **Primary track** | Fire TV |
| **Mini challenges** | AWS Builder (Bedrock + Polly) · Open Source (`tv-focus-kit`) |
| **Bonus** | Friction log (up to +10% score) |
| **Status** | Planning |

---

## 1. Problem & pitch

Family game night on a TV today means either (a) one person holding the remote while everyone else watches, or (b) buying extra controllers. Trivia apps are generic: the same questions for a 9-year-old and their grandparent.

**Huddle** turns a Fire TV into a party host:
- Scan a QR code → your phone becomes a controller (no app install).
- An AI host builds rounds **for this room**: the family picks themes ("Bollywood", "Minecraft", "Laurier campus"), sets age ranges, and questions adapt.
- A voiced host narrates, reacts, and keeps score on the big screen.

**One-liner for judges:** *A multi-modal Fire TV experience (D-pad + phones + voice) where an AI host generates personalized party games for the whole household.*

## 2. Why this scores well

| Judging criterion (25% each) | How Huddle hits it |
|---|---|
| **Tech implementation** | Real-time multi-device sync, Bedrock structured generation, Polly voice, runs on Fire TV hardware |
| **Design** | 10-foot UI, D-pad focus system, phone companion UI, choreographed TV ↔ phone transitions |
| **Potential impact** | Families, roommates, student clubs, classrooms. Clear Appstore category (party/trivia) |
| **Quality of idea** | Matches their own "creative" example: *"multi-modal UX combining voice + D-pad + visual in a single flow"* and "AI-enhanced… adapts to household" |

Avoid the "obvious" trap: it must not feel like a plain quiz app. The **personalization** (themes + ages) and the **host personality** are what make it different. Protect both.

## 3. Scope

You have ~19 days solo. Scope is the main risk, so it's split hard.

### MVP (must ship, enough to win on its own)
1. **TV lobby**: room code + QR, players appear live with name + avatar as they join.
2. **Phone controller (web)**: join by QR/code, pick name + avatar, answer screen, personal result.
3. **Game setup on TV (D-pad)**: pick 1–3 themes (presets + "type your own" from a phone), difficulty/age band, number of rounds.
4. **One game mode: AI Trivia**: Bedrock generates questions as JSON for the chosen themes/ages; 4 options; timer; reveal; points for speed + accuracy.
5. **Leaderboard between rounds + final podium.**
6. **Full D-pad navigation** with clear focus states; Back button behaves correctly everywhere.
7. **Runs on your Fire TV device**, demo-able in a 3-min video.

### Should have (adds a lot of polish and points)
- **Voiced AI host** (Polly): reads questions, reacts to results ("Ammu just stole first place!").
- **Per-player difficulty**: kids get easier questions or picture answers in the same round.
- **Remote-only mode**: no phones? Pass-the-remote play. (Accessibility + resilience in the demo.)
- Sound design + animated transitions.

### Stretch (only if ahead of schedule)
- Second mode: **"Fib It"** (players write fake answers, others guess the real one) or **Draw & Guess**.
- **Strands agent host** that tracks the game and adapts the next round (bumps AWS Builder "creativity": multi-service, agentic).
- Room history / rematch with the same family profile.
- Alexa+ / voice answers.

### Explicitly out of scope
Accounts/login, payments, publishing to the Appstore, persistent profiles across devices, moderation beyond basic prompt guardrails.

## 4. Users & core flow

**Personas:** a parent setting up family night (host); kids 8+ (players, low reading speed); grandparent (unfamiliar with tech; phone join must be dead simple); a student club running a social.

```
TV: Launch → Home ──► Create room ──► Lobby (QR + code)
                                         │  phones join (name, avatar)
                                         ▼
                                    Game setup (themes, ages, rounds)  ◄─ phones can suggest a theme
                                         ▼
                              "Host is writing your game…" (Bedrock)
                                         ▼
               ┌──► Question (TV shows Q + timer · phones show A/B/C/D)
               │         ▼
               │    Reveal (correct answer, who got it, host reaction)
               │         ▼
               └─── Leaderboard (every N questions)
                         ▼
                    Final podium → Play again / New themes / Exit
```

## 5. Screens (see `docs/wireframes.html`)

**TV (1920×1080, D-pad)**
1. Home: Start party · How to play · Settings
2. Lobby: big QR + 4-letter room code, player tiles, "Start" (enabled at ≥1 player)
3. Setup: theme chips (focusable grid), age/difficulty, rounds, Generate
4. Generating: host animation + witty loading lines (masks Bedrock latency)
5. Question: question, 4 color-coded options, timer, who has answered (avatars)
6. Reveal: correct option highlighted, player results, host line
7. Leaderboard: animated rank changes
8. Podium: top 3, confetti, Play again
9. Pause/Back overlay: Resume · Quit to lobby

**Phone (mobile web, portrait)**
1. Join: room code (pre-filled from QR), name, avatar picker
2. Waiting: "You're in!", your avatar, optional "suggest a theme" input
3. Answer: 4 huge color/shape buttons (match the TV colors; shapes for color-blind players)
4. Locked in / Result: correct or not, points, rank
5. Final: your placement, Play again

## 6. Design guidelines (10-foot UI)

- Frame: **1920×1080**; keep content inside a **~5% safe margin** (TVs overscan).
- Text: body ≥ 28px, question ≥ 48px at 1080p. Readable from 3 m.
- **Focus is the cursor.** Every focusable element needs an obvious focus state (scale + outline/glow). No hover states.
- D-pad keys: ↑ ↓ ← → · Select · Back · Menu · Play/Pause. Back must always do something predictable.
- Keep focus paths short: a grid of ≤ 3 rows. Never trap focus.
- Typing on TV is bad: anything text-based (names, custom themes) happens on the **phone**.
- Color + shape for answers (▲ ◆ ● ■), never color alone.
- Phone and TV share one visual language, so the phone feels like *part of* the TV.

### Design tools: Figma vs alternatives

| Tool | Use it for | Verdict |
|---|---|---|
| **Figma** | Screens, components, tokens, handoff | **Recommended.** The Figma MCP is connected to Claude Code, so frames can be pulled into code. Caveat: your Starter plan caps MCP calls (~20/session), so use it for handoff checkpoints, not every tweak. Design in the `Saf` or `Laurier` team (full seats). |
| **ProtoPie** | Prototyping **phone ↔ TV linked interactions** (tap on phone → TV reacts) | Best alternative for *this* concept. Great for demo-video storyboarding. Free tier is limited. |
| **Rive** | Animated host mascot, transitions | Optional add-on. Has a React Native runtime, so animations ship as-is. |
| **Framer** | Fast interactive web prototypes | Good for the phone controller, weaker for TV. |
| **Penpot** | Open-source Figma alternative | Only if you hit Figma limits. |

**Suggested path:** wireframes (this repo) → Figma hi-fi + design tokens → (optional) Rive host → code. Skip ProtoPie unless you want a linked prototype before code exists.

## 7. Architecture

```
┌──────────────────────┐        WebSocket        ┌───────────────────────────┐
│  Fire TV app         │◄──────────────────────►│  Game server (Node + TS)   │
│  React Native        │                         │  - rooms & game state      │
│  (Vega or Fire OS)   │                         │  - timer authority         │
│  - D-pad UI          │                         │  - scoring                 │
│  - plays host audio  │                         │                            │
└──────────────────────┘                         │   ┌── Amazon Bedrock ──┐   │
                                                 │   │ question gen (JSON) │   │
┌──────────────────────┐        WebSocket        │   │ host lines          │   │
│  Phone controller    │◄──────────────────────►│   └─────────────────────┘   │
│  React + Vite (web)  │                         │   ┌── Amazon Polly ─────┐   │
│  opened via QR       │                         │   │ host voice → S3 URL │   │
└──────────────────────┘                         │   └─────────────────────┘   │
                                                 │   DynamoDB (stretch: room  │
                                                 │   persistence / history)   │
                                                 └───────────────────────────┘
```

**Key principle: the server is the source of truth.** TV and phones are views. The server owns the timer and scoring, so clients can't desync.

### 7.1 Fire TV app: pick your OS first (Day 1)
Check your stick: **Settings → My Fire TV → About**.
- **Vega OS** (Fire TV Stick 4K Select and newer): build with **React Native for Vega** (Vega SDK + Vega Virtual Device simulator). Android APKs won't sideload.
- **Fire OS** (most older sticks): React Native via `react-native-tvos`, or Android. Sideload over ADB.

**Recommendation:** React Native either way. Amazon publishes a monorepo pattern for sharing RN code across Vega + other TV OSes ("Reuse your React Native Vega code across TV Operating Systems" on the Amazon developer community). Following it also signals ecosystem understanding to judges.

### 7.2 Phone controller
React + Vite + TypeScript, mobile web. Served by the game server (or any static host). The QR encodes `https://<host>/join/<ROOMCODE>`.

### 7.3 Game server
Node + TypeScript, `ws` (or Socket.IO). In-memory room store for MVP.
- Host on an **EC2/Lightsail** instance (keeps everything AWS). Use a tunnel (e.g. ngrok/cloudflared) during dev so the TV and phone can reach your laptop.
- Bedrock: one call per game to generate the full question set (low latency during play), plus short host lines. Use structured JSON output, validated with `zod`; retry on bad JSON.
- Polly: synthesize host lines → cache mp3 in S3 → send URL to TV.

### 7.4 Shared package
`packages/shared`: TypeScript types for the event protocol + game state, imported by all three apps.

### 7.5 Event protocol (draft)

| Direction | Event | Payload |
|---|---|---|
| TV → S | `room:create` | — |
| S → TV | `room:created` | `{ code, joinUrl }` |
| Phone → S | `player:join` | `{ code, name, avatar }` |
| S → all | `room:state` | `{ players[], phase, settings }` |
| Phone → S | `theme:suggest` | `{ text }` |
| TV → S | `game:configure` | `{ themes[], ageBand, rounds }` |
| TV → S | `game:start` | — |
| S → all | `game:generating` | — |
| S → all | `question:show` | `{ index, text, options[], endsAt, audioUrl? }` |
| Phone → S | `answer:submit` | `{ questionIndex, optionIndex }` |
| S → all | `question:reveal` | `{ correctIndex, results[], hostLine, audioUrl? }` |
| S → all | `leaderboard:show` | `{ standings[] }` |
| S → all | `game:end` | `{ podium[] }` |
| any | `player:leave` / reconnect by `playerId` | — |

### 7.6 Bedrock question schema (draft)
```json
{
  "questions": [
    {
      "theme": "Minecraft",
      "difficulty": "easy",
      "text": "What do you need to craft a torch?",
      "options": ["Stick + coal", "Stone + wool", "Sand + iron", "Wood + string"],
      "correctIndex": 0,
      "funFact": "Charcoal works too!"
    }
  ]
}
```
Guardrails: family-safe system prompt, Bedrock Guardrails (stretch), shuffle options server-side, dedupe questions.

## 8. Repo layout

```
huddle-tv/
├─ apps/
│  ├─ tv/            React Native TV app (Vega or Fire OS)
│  ├─ controller/    Phone web controller (React + Vite)
│  └─ server/        Game server (Node + TS, ws, Bedrock, Polly)
├─ packages/
│  ├─ shared/        Event + state types
│  └─ tv-focus-kit/  Open-source D-pad focus components → Open Source mini challenge
└─ docs/
   ├─ PRD.md
   ├─ wireframes.html
   ├─ friction-log.md
   └─ product-feedback.md
```

## 9. Plan (Oct 4 → Oct 23)

| Dates | Goal | Done when |
|---|---|---|
| **Oct 4–5** | Setup | Fire TV OS confirmed, hello-world on the stick, AWS account + **$150 credits form (due Oct 21)**, Bedrock model access granted |
| **Oct 5–8** | Design | Figma: TV lobby, question, reveal, podium + phone join/answer. Design tokens. |
| **Oct 7–10** | Walking skeleton | TV shows QR → phone joins → player appears in TV lobby (real device, real network) |
| **Oct 11–14** | Game loop | Hard-coded questions → full round trip, timer, scoring, leaderboard, podium |
| **Oct 14–16** | AI | Bedrock generation with themes/ages; generating screen |
| **Oct 16–19** | Polish | Polly host voice, animations, sound, focus states, Back handling, remote-only mode |
| **Oct 19–20** | Open source | Extract `tv-focus-kit`, README + license + example, publish |
| **Oct 20–21** | Demo video | Script → record on device → edit to < 3 min |
| **Oct 22** | Submit | Description, repo, video, feedback, friction log, mini challenge fields |
| Oct 23 | Buffer | Deadline 3pm EDT |

**Rule:** if the walking skeleton isn't running on the real TV by Oct 10, cut "Should have" items immediately.

## 10. Demo video (< 3 min) outline
1. **0:00–0:15** Hook: family on the couch, one remote, everyone bored → "What if every phone was a controller?"
2. **0:15–0:45** Scan QR, three phones join, avatars pop onto the TV.
3. **0:45–1:15** Pick themes on TV with the remote; a kid suggests "Pokémon" from their phone; host generates.
4. **1:15–2:15** Play two questions: TV and phones in sync, host voice reacts, leaderboard shuffle.
5. **2:15–2:45** Architecture slide (Fire TV + Bedrock + Polly), "why it matters."
6. **2:45–3:00** Podium + close.

Record the TV with an HDMI capture card if you can (clean footage); film the phones in hand for the multi-device moment. No copyrighted music.

## 11. Submission checklist
- [ ] Text description (what it does + how it works)
- [ ] GitHub repo with setup/run instructions (public + LICENSE, or private + add `testing@devpost.com` and the 6 Amazon DevRel users **at submit time**; invites expire in 7 days)
- [ ] Demo video < 3 min, public on YouTube/Vimeo, shows it running on the Fire TV device/simulator
- [ ] Product feedback for every tool (Vega/Fire TV SDK, Bedrock, Polly…), incl. AWS services used
- [ ] Track: Fire TV · Mini challenges: AWS Builder + Open Source
- [ ] Open Source fields: contribution URL, repo URL, GitHub username, what/how/why
- [ ] Friction log entries (`docs/friction-log.md`)
- [ ] Optional feature requests

## 12. Risks

| Risk | Mitigation |
|---|---|
| Vega/Fire TV toolchain setup eats days | Do it Day 1; log every snag (it's friction-log material) |
| TV + phone can't reach dev server | Use a public tunnel or deploy the server early |
| Bedrock latency during play | Generate the whole set up front; "host is writing" screen |
| Bad/unsafe AI questions | JSON validation, family-safe prompt, regenerate button |
| Scope creep | MVP is one mode. Second mode only after Oct 17 if everything's green |
| Demo-day flakiness | Record the video from a known-good build; keep a seeded "demo" theme set |

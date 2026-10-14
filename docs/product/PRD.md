# Huddle Home: PRD

> The household hub for a Vega home: the Fire TV is the screen, the Echo is the voice, the phone is the keyboard. Widgets, profiles, Amazon's own AI, and one-press launch into the apps you already use.

| | |
|---|---|
| **Hackathon** | Build, Ship, Shape: Amazon Developer Hackathon |
| **Deadline** | Oct 23, 2026 · 3:00pm EDT (aim: submit Oct 22) |
| **Primary track** | Fire TV |
| **Mini challenges** | AWS Builder (Bedrock, Polly, Transcribe, DynamoDB, S3) · Open Source |
| **Bonus** | Friction log (up to +10%) |
| **Related docs** | [Roadmap](roadmap.md) · [Architecture](../architecture/architecture.md) · [Design guide](../design/design-guide.md) · [Wireframes](../design/wireframes.html) · [Ideas backlog](ideas-backlog.md) |

---

## 1. Problem

The TV is the one screen the whole household shares, but its home screen is built for **one anonymous viewer and for selling content**:
- It's an ad-heavy grid of apps and promos. Nothing on it is about *your family*.
- Every night starts with "what should we watch?" and 15 minutes of scrolling across 5 apps.
- Household info (who's home for dinner, the dentist on Thursday, chores, family photos) lives on phones and fridge whiteboards, not on the biggest screen in the house.
- When the TV is idle it's a black rectangle.

## 2. Pitch

**Huddle Home** is one household, reached from three places:
1. **Fire TV (Vega app).** "Who's here?", widgets, app shortcuts, and the Tonight picker on the big screen.
2. **Echo (voice).** Echo Dot Max and Echo Show 8 run Vega OS, but Amazon's Vega app tools target Fire TV. The Echo talks to the same household through Alexa, so someone in the kitchen can post to the board or ask what's on tonight. The TV stays the screen.
3. **Phone (web).** Scan a QR code to type, talk, or send a photo. No app install.

On the TV:
1. **"Who's here?"** Pick the profiles in the room. The home screen adapts to them.
2. **Widgets**: family board, agenda, weather, photos, sports scores.
3. **Your apps, one press away**: shortcuts into Netflix, Prime Video, YouTube and others, reordered by what *this household* actually uses at *this time of day*.
4. **"Tonight" picker**: who's watching and the mood. Amazon Bedrock suggests titles, says which of your services has them, and launches straight into that app.
5. **A game shelf, later**: one built-in game, plus a folder anyone can drop a game into.

**One-liner for judges:** *A household hub on Vega: the Fire TV screen adapts to who's in the room, the Echo is the voice, and Amazon's own AI picks what to watch and says it out loud.*

## 3. Why it scores

| Criterion (25% each) | How Huddle Home hits it |
|---|---|
| **Tech implementation** | React Native for Vega OS, `Linking` into other apps, one household API shared by TV, phone, and Alexa on Echo, Bedrock + Polly + Transcribe |
| **Design** | A whole home-screen system: widget grid, focus model, edit mode, ambient mode, profile theming. Lots of surface to show craft. |
| **Potential impact** | Every Fire TV household. Clear Appstore fit (productivity/lifestyle). Families, roommates, care homes, dorms. |
| **Quality of idea** | Matches the judges' own "creative" examples: *"AI-enhanced viewing that adapts to household patterns"* and *"multi-modal UX combining voice + D-pad + visual"*. Not a streaming UI clone. |

**Watch out for the "obvious" trap.** Judges list "basic streaming UI" as obvious. Huddle Home must not read as "a nicer app grid". Lead every demo moment with something only Huddle does: household adaptation, phone → TV, ambient mode.

## 4. Platform facts that shape the product

**Target platform:** **Vega OS** (React Native for Vega), 1080p. Demo on the **Vega Virtual Device**. A Vega Fire TV (Stick 4K / 4K Select, Vega OS 2.0) is the real-device path if we get one. The Fire TV Stick HD already in the house runs **Fire OS 8** and cannot install this build.


| Fact | Consequence |
|---|---|
| Amazon blocks third-party launchers; the remote's **Home button always goes to Amazon's home**. | Huddle is an app you open (pin it first in the apps row). Don't use launcher exploits. Frame it as "your family's home *inside* Fire TV". |
| Apps are sandboxed: **no access to what's playing or other apps' watch history**. | "Household patterns" come from what happens *in Huddle*: who's here, what they launched, when. |
| Vega has no Android `PackageManager`. Other apps open through React Native **`Linking`** (`canOpenURL` / `openURL`): custom schemes, https, and `amzns://apps?asin=…`. | The phone companion records which services the household has. The TV launches those URIs. Title deep link where the app publishes one, otherwise open the app. Verify on Day 1 ([spike](roadmap.md)). |
| Consumer sideloading is off on Vega. | Judges run the Vega Virtual Device, or a device in developer mode. Ship a `.vpkg`, not an APK. |
| React and React Native are provided by Vega OS. | Do not bundle them in the app. |
| The remote's voice button goes to Alexa, not your app. | Text input happens on the **phone**. Voice in the room happens on the **Echo**, which calls the same API. |
| Echo Dot Max and Echo Show 8 run Vega OS. Amazon's own Vega FAQ says third-party apps are built for Fire TV, and Echo work goes through the Alexa developer portal. | Do not try to install the TV app on an Echo. Treat the Echo as a voice client of the household. Echo Dot Max has no screen; Echo Show can speak Alexa's answer. |

## 5. Users

- **Parent / household organizer**: sets up profiles, posts to the board, wants less scrolling at night.
- **Kids (8+)**: want their apps fast, love seeing their photos and stickers on the TV.
- **Grandparent**: needs big, simple, predictable UI. Ambient photo frame is the killer feature for them.
- **Roommates / student house**: shared chores, bills reminders, group watch picks.

## 6. Features & scope

Build in this order. A later phase does not start until the one before it plays on the Vega Virtual Device. If time runs out, the demo is whatever phase is finished.

### Phase 1 — Home on the TV (design this first, then build it)
| # | Feature | Notes |
|---|---|---|
| M1 | **Profile picker** ("Who's here?") | Multi-select avatars. Sets greeting and app order. |
| M2 | **Home screen**: greeting + apps row + two widgets | Clock+Weather and Family Board. Agenda and Photos wait. |
| M3 | **App shortcuts** | Services chosen on the phone. TV launches them with `Linking`. |
| M8 | D-pad focus and Back | Every focusable tile has a visible focus state. |

Figma for this phase: Who's here, Home, launching overlay. Nothing else.

### Phase 2 — The household loop, using Amazon's AI
| # | Feature | Amazon tool |
|---|---|---|
| M5 | Phone companion: QR, post a note, add an event, send a photo | The server is the household. TV updates live. |
| M4 | Agenda and Photos widgets | |
| M6 | **Tonight** picker: mood → 3–5 picks with a service badge → launch | **Bedrock** (Nova) for the picks. A watch-provider API checks "on Netflix". |
| M7 | Launch log → apps row reorder + one "suggested now" chip | |
| | Plain-English events ("dentist Thursday 4pm for Ammu") | **Bedrock** |
| | Hold-to-talk on the phone | **Transcribe** |
| | TV reads the brief and announces a new board post | **Polly** |

### Phase 3 — Echo is the voice of the same household
- An Alexa interaction (custom skill, or the Huddle MCP if that is further along) posts to the board and answers "what's on tonight".
- Same household id, same events. A post from the kitchen Echo shows up on the TV.
- Echo Dot Max is voice only. Echo Show speaks the answer. We do not draw a second UI for them in this hackathon.

### Phase 4 — Games, only if phase 2 is green
- **One built-in game**: party trivia. TV shows the question, phones are the controllers, Bedrock writes the questions, Polly can host.
- **A contributor slot.** A game is a folder with a `manifest.json` (id, title, min/max players) plus its TV screen and phone controls. Dropping a folder adds it to the Games row. That folder is the open-source contribution: someone else can add a game without touching the home screen. Wireframes already exist in [wireframes-games.html](../design/wireframes-games.html).

### Parked
- Ambient mode, widget edit mode, sports widget
- Ring doorbell overlay (Amazon already lists a Ring tile as an obvious idea)
- Google Calendar import, chore rotation, cooking timer

### Out of scope
Real accounts/auth (household code + PIN only), replacing the system launcher, reading other apps' data, payments, Appstore publishing, installing the Vega app onto an Echo.

## 7. Core flows

**First run:** Open Huddle → "Set up your household" → QR code → phone companion creates household, adds profiles + picks streaming apps → TV home appears.

**Daily:** Open Huddle → "Who's here?" (Rafi + Nanu) → home greets them, apps row puts YouTube Kids first (it's 4pm Saturday) → board shows "Dinner at 7".

**Tonight:** Home → "Tonight" → who (pre-filled) → mood chips (Funny · Cozy · Edge-of-seat · Learn something) → generating → 5 picks with service badges → Select → "Opening on Prime Video…" → Prime launches to the title.

**Phone → TV:** Scan QR → "Post to board" → type "Pizza night 🍕" → appears on the TV instantly with an animation + who posted it.

**Echo → TV:** In the kitchen, "Alexa, ask Huddle to post pizza night" → the same note lands on the TV board.

**Idle:** 10 min no input → ambient mode, once that phase exists → any key returns home.

## 8. Screens

**Phase 1 TV** (draw these in Figma first): see [wireframes](../design/wireframes.html)
1. Who's here? (profile picker)
2. Home (greeting + apps row + Clock/Weather + Board)
3. Launching overlay

**Phase 2:** pairing QR, Board/Agenda/Photos expanded, Tonight (mood → picks), phone quick actions.

**Phase 3:** no new TV screen. The Echo speaks; the TV board updates.

**Phase 4:** Games row on Home, then the trivia flow in [wireframes-games.html](../design/wireframes-games.html).

**Phone companion** (phase 2)
1. Pair / join household
2. Quick actions (Post · Event · Photo · Tonight remote)
3. Post note / Add event (plain English) / Send photo
4. Household setup: profiles + which streaming services you have

## 9. Success criteria for the demo
Phase 1 is enough to record a first cut. The full demo adds the later checks.
- Opens on the Vega Virtual Device, profile pick → home in < 2s, and launches one real app
- A phone post, and a phrase spoken to the Echo, both appear on the TV board
- "Tonight" returns picks in < 8s (Bedrock) and launches a streaming app
- Polly speaks one line on the TV
- Zero focus dead-ends; Back always predictable

## 10. Risks
| Risk | Mitigation |
|---|---|
| Deep links into specific titles don't work for some apps on your device | Day-1 spike. Fall back to "open app" / app search. Demo with apps that work. |
| Vega/RN toolchain setup eats days | Start from `react-native-multi-tv-app-sample`; log every snag in the friction log |
| Looks like "just another launcher" | Lead the demo with household adaptation + phone → TV + ambient |
| Watch-provider data is incomplete | Show "available on" only when known; otherwise "search in Netflix" |
| Scope creep (hub + games + AI) | Phases are sequential. The demo is the last finished phase. Games wait until the household loop works. |
| Judges never run it | They may score from the text and video alone: make the video the priority; keep the hosted demo live through Nov 20 with zero-setup judge access |

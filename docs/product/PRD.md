# Huddle Home: PRD

> The family home screen for Fire TV. Widgets, profiles, and an AI that learns your household, with one-press launch into the apps you already use.

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

**Huddle Home** is a Fire TV app that becomes the household's home base:
1. **"Who's here?"** Pick the profiles in the room. The home screen adapts to them.
2. **Widgets**: family board, agenda, weather, photos, sports scores, all on the big screen.
3. **Your apps, one press away**: shortcuts into Netflix, Prime Video, YouTube and others, reordered by what *this household* actually uses at *this time of day*.
4. **"Tonight" picker**: say who's watching and the mood. The AI suggests titles, tells you which of your services has them, and launches straight into that app.
5. **Phone companion**: scan a QR code to post a note, add an event in plain English, or send photos to the TV. No app install.
6. **Ambient mode**: when idle, the TV becomes a family frame (photos, clock, today's board).

**One-liner for judges:** *An AI-enhanced Fire TV home experience that adapts to household patterns, combining D-pad, phone, and ambient display, and launching into the streaming apps families already pay for.*

## 3. Why it scores

| Criterion (25% each) | How Huddle Home hits it |
|---|---|
| **Tech implementation** | React Native on Vega/Fire OS, app-to-app deep links, real-time phone ↔ TV sync, Bedrock structured generation, pattern learning |
| **Design** | A whole home-screen system: widget grid, focus model, edit mode, ambient mode, profile theming. Lots of surface to show craft. |
| **Potential impact** | Every Fire TV household. Clear Appstore fit (productivity/lifestyle). Families, roommates, care homes, dorms. |
| **Quality of idea** | Matches the judges' own "creative" examples: *"AI-enhanced viewing that adapts to household patterns"* and *"multi-modal UX combining voice + D-pad + visual"*. Not a streaming UI clone. |

**Watch out for the "obvious" trap.** Judges list "basic streaming UI" as obvious. Huddle Home must not read as "a nicer app grid". Lead every demo moment with something only Huddle does: household adaptation, phone → TV, ambient mode.

## 4. Platform facts that shape the product

**Target device:** Fire TV Stick HD (1st gen), **Fire OS 8** (Android 11 based), 1080p. Build the Android TV target of the React Native app; Vega (simulator) is a stretch "runs on both" bonus.


| Fact | Consequence |
|---|---|
| Amazon blocks third-party launchers; the remote's **Home button always goes to Amazon's home**. | Huddle is an app you open (pin it first in the apps row). Don't use launcher exploits. Frame it as "your family's home *inside* Fire TV". |
| Apps are sandboxed: **no access to what's playing or other apps' watch history**. | "Household patterns" come from what happens *in Huddle*: who's here, what they launched, when. |
| **On Fire OS, Huddle can list installed apps and launch them** (Android `PackageManager` + launch intents), and deep link into titles where the app supports it. | **Auto-detect** installed streaming apps (no manual setup). Launch a title where supported, else open the app. Verify on Day 1 ([spike](roadmap.md)). |
| The remote's voice button goes to Alexa, not your app. | Text input happens on the **phone companion**. |

## 5. Users

- **Parent / household organizer**: sets up profiles, posts to the board, wants less scrolling at night.
- **Kids (8+)**: want their apps fast, love seeing their photos and stickers on the TV.
- **Grandparent**: needs big, simple, predictable UI. Ambient photo frame is the killer feature for them.
- **Roommates / student house**: shared chores, bills reminders, group watch picks.

## 6. Features & scope

### MVP (must ship, enough to win on its own)
| # | Feature | Notes |
|---|---|---|
| M1 | **Profile picker** ("Who's here?") | Multi-select avatars. Sets theme, greeting, app order. |
| M2 | **Home screen**: greeting/brief hero + apps row + widget grid | The core design showcase |
| M3 | **App shortcuts** to installed streaming apps | Auto-detected from the device (Netflix, Prime Video, YouTube, Disney+, Crave, Spotify…). "Opening Netflix…" transition with fallback. |
| M4 | **Widgets ×4**: Clock+Weather, Family Board, Agenda, Photos | Each has a compact tile + an expanded view |
| M5 | **Phone companion (web)**: QR pairing, post note, add event, send photo | Real-time update on TV |
| M6 | **"Tonight" picker (AI)**: who's watching + mood → 3–5 picks with "on Netflix" badges → launch | Bedrock + a watch-provider data source (e.g. TMDB) |
| M7 | **Household patterns v1**: log launches by profile + time; reorder apps row; one "suggested now" chip | Simple stats first. AI phrasing on top. |
| M8 | Full D-pad navigation, focus states, Back behaviour | Non-negotiable for the Design score |

### Should have
- **Ambient mode** after N minutes idle: photo slideshow + clock + today's board
- **Daily brief (AI)**: per-profile greeting summarizing agenda, board, weather ("Rafi, 2 chores left, Raptors at 7:30")
- **Natural-language input** on phone: "dentist Thursday 4pm for Ammu" → structured event (Bedrock)
- **Voice input on the phone (Amazon Transcribe)**: hold-to-talk on the companion for board notes, events and Tonight requests ("something funny for me and the kids")
- **Huddle's voice (Amazon Polly)**: the TV reads the daily brief aloud when people check in, announces new board posts ("Ammu posted: pizza night"), and gives ambient-mode reminders. Mutable, and quiet hours by default
- **Edit mode** on TV: add, remove and rearrange widgets with the D-pad
- **Sports widget** (sports is a priority category): follow teams per profile, live scores

### Bonus (only if everything above is green by Oct 17)
- **Huddle Games**: phones-as-controllers party trivia, launched from the home screen (the original concept, see [ideas backlog](ideas-backlog.md))
- Ring doorbell tile / "someone's at the door" overlay
- Expose Huddle actions as an **MCP server** so any agent (incl. Alexa+-style assistants) could post to the board or ask "what's on tonight"
- Google Calendar / ICS import, chore rotation, cooking timer

### Out of scope
Real accounts/auth (household code + PIN only), replacing the system launcher, reading other apps' data, payments, Appstore publishing.

## 7. Core flows

**First run:** Open Huddle → "Set up your household" → QR code → phone companion creates household, adds profiles + picks streaming apps → TV home appears.

**Daily:** Open Huddle → "Who's here?" (Rafi + Nanu) → home greets them, apps row puts YouTube Kids first (it's 4pm Saturday) → board shows "Dinner at 7".

**Tonight:** Home → "Tonight" → who (pre-filled) → mood chips (Funny · Cozy · Edge-of-seat · Learn something) → generating → 5 picks with service badges → Select → "Opening on Prime Video…" → Prime launches to the title.

**Phone → TV:** Scan QR → "Post to board" → type "Pizza night 🍕" → appears on the TV instantly with an animation + who posted it.

**Idle:** 10 min no input → ambient mode → any key returns home.

## 8. Screens

**TV**: see [wireframes](../design/wireframes.html)
1. Pairing / first run (QR)
2. Who's here? (profile picker)
3. Home (hero + apps row + widget grid)
4. Widget expanded views (Board, Agenda, Photos, Weather)
5. Tonight: who + mood → generating → results
6. Launching overlay (+ "couldn't open, open app instead" fallback)
7. Edit mode
8. Ambient mode
9. Settings (profiles, apps, idle timer)

**Phone companion**
1. Pair / join household
2. Quick actions (Post · Event · Photo · Tonight remote)
3. Post note / Add event (plain English) / Send photo
4. Household setup: profiles + which streaming services you have

## 9. Success criteria for the demo
- Opens on a real Fire TV, profile pick → home in < 2s
- A phone post appears on the TV in < 1s
- "Tonight" returns picks in < 8s and launches a real streaming app
- Apps row visibly reorders based on who's here / time of day
- Zero focus dead-ends; Back always predictable

## 10. Risks
| Risk | Mitigation |
|---|---|
| Deep links into specific titles don't work for some apps on your device | Day-1 spike. Fall back to "open app" / app search. Demo with apps that work. |
| Vega/RN toolchain setup eats days | Start from `react-native-multi-tv-app-sample`; log every snag in the friction log |
| Looks like "just another launcher" | Lead the demo with household adaptation + phone → TV + ambient |
| Watch-provider data is incomplete | Show "available on" only when known; otherwise "search in Netflix" |
| Scope creep (it's a whole home screen) | MVP = 4 widgets. Games and Ring are bonus only. |

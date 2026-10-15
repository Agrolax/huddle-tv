# Huddle Home: PRD

> The family home screen for Fire TV on Vega OS: widgets for the whole household, a phone companion that joins with a QR code, Bedrock picks for tonight, and Sketch it, a draw-and-guess game where phones are the pens.

| | |
|---|---|
| **Hackathon** | Build, Ship, Shape: Amazon Developer Hackathon |
| **Deadline** | Oct 23, 2026 · 3:00pm EDT (aim: submit Oct 22) |
| **Primary track** | Fire TV |
| **Mini challenges** | AWS Builder (Bedrock, DynamoDB, S3; Polly/Transcribe stretch) · Open Source (`tv-focus-kit`) |
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

**Huddle Home** is a family home screen app for Fire TV (Vega OS). Scope locked Oct 14:

1. **Widgets on the TV**: Clock + weather, Family calendar, **Tonight** picks from Amazon Bedrock for whoever is in the room, and Profiles ("Who's here?").
2. **Phone companion via QR**: scan the code on the TV, no install. From the phone: switch profile, send a message to the TV, chat with the household AI.
3. **One game, Sketch it**: one phone draws, the strokes stream live to the TV, everyone else guesses from their phones. Bedrock writes the prompts.
4. **Smart home widget (simulated)**: lights, thermostat, door lock you can see on the TV and flip from the phone. Simulated devices, real interaction model.

**Stretch only:** Polly (TV speaks a line) and Transcribe (hold-to-talk on the phone). Echo Show as a second display is researched in [echo-show.md](../research/echo-show.md) and comes after Sketch it.

**One-liner for judges:** *The Fire TV home screen, rebuilt for the whole family: it knows who's on the couch, your phone is the keyboard and the pen, and Amazon Bedrock picks what to watch and what to draw.*

## 3. Why it scores

| Criterion (25% each) | How Huddle Home hits it |
|---|---|
| **Tech implementation** | React Native for Vega OS, a deterministic D-pad focus system (`tv-focus-kit`, open source), one realtime household protocol shared by TV, phones and future displays, live stroke streaming, Amazon Bedrock |
| **Design** | A whole home-screen system: widget grid, focus model, Who's here, phone-as-controller. Lots of surface to show craft. |
| **Potential impact** | Every Fire TV household. Clear Appstore fit (productivity/lifestyle). Families, roommates, care homes, dorms. |
| **Quality of idea** | Matches the judges' own "creative" examples: *"AI-enhanced viewing that adapts to household patterns"*, *"family entertainment"* and *"multi-modal UX"* (D-pad + phone touch + TV). Not a streaming UI clone. |

**Watch out for the "obvious" trap.** Judges list "basic streaming UI" as obvious. Huddle Home must not read as "a nicer app grid". Lead every demo moment with something only Huddle does: Who's here adapts the home, phone → TV, Sketch it.

## 4. Platform facts that shape the product

**Target platform:** **Vega OS** (React Native for Vega), 1080p. Demo on the **Vega Virtual Device**. A Vega Fire TV (Stick 4K / 4K Select, Vega OS 2.0) is the real-device path if we get one. The Fire TV Stick HD already in the house runs **Fire OS 8** and cannot install this build.


| Fact | Consequence |
|---|---|
| Amazon blocks third-party launchers; the remote's **Home button always goes to Amazon's home**. | Huddle is an app you open (pin it first in the apps row). Don't use launcher exploits. Frame it as "your family's home *inside* Fire TV". |
| Apps are sandboxed: **no access to what's playing or other apps' watch history**. | "Household patterns" come from what happens *in Huddle*: who's here, what they launched, when. |
| Vega has no Android `PackageManager`. Other apps open through React Native **`Linking`** (`canOpenURL` / `openURL`): custom schemes, https, and `amzns://apps?asin=…`. | Launching a streaming app from a Tonight pick goes through `Linking`. Stretch since the Oct 14 scope lock; needs the launch spike first. |
| Consumer sideloading is off on Vega. | Judges run the Vega Virtual Device, or a device in developer mode. Ship a `.vpkg`, not an APK. |
| React and React Native are provided by Vega OS. | Do not bundle them in the app. |
| The remote's voice button goes to Alexa, not your app. | Text input (messages, AI chat, guesses) happens on the **phone**. |
| Echo Dot Max and Echo Show 8 run Vega OS, but there is no third-party Vega app path for Echo devices. | An Echo Show can join later as a `display` client through an Alexa skill that opens our web page (`Alexa.Presentation.HTML`). Researched in [echo-show.md](../research/echo-show.md); stretch. |

## 5. Users

- **Parent / household organizer**: sets up profiles, posts to the board, wants less scrolling at night.
- **Kids (8+)**: want their apps fast, love seeing their photos and stickers on the TV.
- **Grandparent**: needs big, simple, predictable UI. Ambient photo frame is the killer feature for them.
- **Roommates / student house**: shared chores, bills reminders, group watch picks.

## 6. Features & scope

Built in steps. Each step ends with a PR, running on the Vega Virtual Device with screenshots. A later step waits until the one before it runs.

| Step | What | Status |
|---|---|---|
| 1 | **Shell**: npm workspaces monorepo, `tv-focus-kit` (FocusableCard, FocusGrid, focus ring), home screen with placeholder widget tiles, "Who's here?", shared protocol types, Echo Show research | ✅ Oct 14 |
| 2 | **Server + companion pairing**: `apps/server` WebSocket hub, QR pairing, phone switches profile, phone → TV message | ✅ Oct 14 |
| 3 | **Widgets live**: clock/weather (Open-Meteo), family calendar (server data), profiles, smart-home (simulated, toggled from the phone) | ✅ Oct 15 |
| 4 | **Bedrock**: Tonight picks for who's here, phone AI chat | |
| 5 | **Sketch it**: phone draws, strokes stream to the TV, phones guess, Bedrock prompts, scores | |
| 6 | Polish, focus/Back audit, judge setup, demo video | |
| Stretch | Polly line on the TV, Transcribe hold-to-talk, Echo Show display ([research](../research/echo-show.md)), one-press launch into streaming apps from a Tonight pick | |

### TV widgets
| Widget | Phase-1 placeholder | Live version |
|---|---|---|
| Clock & weather | Real clock, static weather | Open-Meteo |
| Family calendar | Three demo events | Server events, added from the phone |
| Who's here (profiles) | Avatars of the selected profiles; Select opens "Who's here?" | Profile switch from the phone too |
| Tonight | Three mood placeholders | Bedrock picks for the people present |
| Sketch it | Entry tile | Live canvas + guesses |
| Home (smart home) | Three simulated devices | Toggle from phone; state on TV |

### Phone companion
Join by QR → pick yourself → switch profile · send a message to the TV · chat with the AI · draw / guess in Sketch it · flip a simulated device.

### Out of scope
Real accounts/auth (household code only), replacing the system launcher, reading other apps' data, payments, Appstore publishing, a Vega app on Echo devices, real smart-home integrations.

## 7. Core flows

**Daily:** Open Huddle → "Who's here?" (Rafi + Nanu) → Home greets them: clock, today's calendar, their avatars, Tonight, Sketch it, smart home.

**Phone joins:** Home → "Connect phone" → QR → phone opens the companion → picks "Ammu" → Ammu's avatar appears on the TV.

**Message:** Phone → "Send to TV" → "Pizza night 🍕" → appears on the TV with who sent it.

**Tonight:** Home → Tonight → Bedrock returns 3–5 picks for the people present, each with a one-line "why".

**Sketch it:** Home → Sketch it → the TV picks a drawer → their phone shows the secret prompt (from Bedrock) → strokes appear live on the TV → others type guesses on their phones → first correct guess scores.

**Smart home:** Phone → "Lamp off" → the TV's Home tile updates.

## 8. Screens

See [wireframes](../design/wireframes.html). Screenshots from the Vega Virtual Device: [step 1](../screenshots/step-1/), [step 2](../screenshots/step-2/).

**TV:** Who's here? · Home (greeting + "Connect phone" + 4×2 widget grid) · Pair (QR) · Tonight · Sketch it (canvas + guesses) · message toast.

**Phone:** Join · Home (profile, message, chat, Sketch it, smart home) · Draw · Guess · Chat.

## 9. Success criteria for the demo
- Opens on the Vega Virtual Device; profile pick → home in < 2s
- Zero focus dead-ends; Back always predictable (step 1 ✅)
- A phone joins by QR and its message appears on the TV
- Tonight returns picks in < 8s (Bedrock)
- A Sketch it round: strokes visible on the TV with < 200 ms lag on a LAN, a correct guess scores

## 10. Risks
| Risk | Mitigation |
|---|---|
| Deep links into specific titles don't work for some apps on your device | Day-1 spike. Fall back to "open app" / app search. Demo with apps that work. |
| Vega/RN toolchain setup eats days | Start from `react-native-multi-tv-app-sample`; log every snag in the friction log |
| Looks like "just another launcher" | Lead the demo with household adaptation + phone → TV + ambient |
| Watch-provider data is incomplete | Show "available on" only when known; otherwise "search in Netflix" |
| Scope creep (hub + games + AI) | Scope locked Oct 14 (§2). Steps are sequential; the demo is the last finished step. Polly/Transcribe/Echo are stretch only. |
| Judges never run it | They may score from the text and video alone: make the video the priority; keep the hosted demo live through Nov 20 with zero-setup judge access |

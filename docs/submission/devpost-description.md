# Devpost description (draft)

Paste the sections below into the Devpost fields. Fill the `TODO` links at the end. Every claim here matches the code on `main` as of Oct 18; re-check "Built with" and the AWS paragraph if the code changes.

---

## Project name
Huddle Home

## Elevator pitch (aim for under 200 characters)
The Fire TV home screen for the whole family. Everyone votes on tonight's movie in secret on their phone, and game night is a quiz about your own week.

## Inspiration
Every night starts with "what should we watch?" and fifteen minutes of scrolling. The TV is the one screen the whole household shares, but its home screen is built for one anonymous viewer. The dentist on Thursday, who is in the room, and that a child has to be in bed by 8:30 all live on phones and fridge whiteboards.

Fire TV and Alexa+ already do a good job for one person talking to one device. They do not settle an argument between four people. Our line is: Alexa is for each of you, Huddle is for all of you.

## What it does
Huddle Home is a family home-screen app for Fire TV on Vega OS.

- **Who's here.** Pick who is on the couch with the remote. The home screen greets them and everything below adapts.
- **Live widgets.** Clock and weather (Open-Meteo), a family calendar, and a simulated smart-home tile (lamp, thermostat, front door, and a demo doorbell), all on a 4×2 grid with a visible focus ring on every element.
- **Phone joins by QR.** Scan the code on the TV and pick yourself. No app to install. From the phone you can switch who's watching, message the TV, add a calendar event, flip the lamp, and chat with a household AI that knows who is in the room, the calendar and the weather.
- **Tonight, decided together.** Amazon Bedrock suggests picks for the people present, with a one-line reason each. It is bedtime-aware: if Rafi (a kid profile) is on the couch, picks end by 8:30, and a 9:00 start tomorrow moves the limit earlier. Then **secret veto**: every phone says yes or no in private, the TV shows who has voted but never how, and reveals only the picks everyone accepted. No overlap triggers sudden death between the top two.
- **Game night, about your family.** A Kahoot-style quiz on one engine: *Our Week* asks about your own calendar, messages and weather ("Who has the dentist on Thursday?"), and *Watched It* asks about the movie you just picked. Phones tap A–D, points go up with speed, and a family league carries across games.
- **Sketch the pick.** One phone is the pen. Strokes stream live to the TV, the other phones guess, and the last movie drawn becomes tonight's pick. The game ends on the decision.

## How we built it
Four pieces in one npm-workspaces TypeScript monorepo:

- **`apps/tv`**: the TV app in React Native for Vega (SDK 0.24, React Native 0.72, `react-native-kepler` 2.1.0), built to a `.vpkg` and run on the Vega Virtual Device.
- **`apps/companion`**: the phone web app (React + Vite), opened from the QR code.
- **`apps/server`**: a Node + TypeScript WebSocket hub. TV, phones and any future second screen speak one household protocol (`packages/shared`). The server owns the state, so the answer to a quiz question never leaves it before the reveal, and a vote is never sent to the TV.
- **`packages/tv-focus-kit`**: our D-pad focus primitives (see Open Source below).

Roughly 250 automated tests run with `npm run check` across the workspaces: protocol and validators, the vote, quiz and sketch engines (also over the wire), the focus grid, and the TV screens under Jest.

## How it uses the Fire TV track tools
Huddle is a React Native for Vega app, so it is built on the Vega toolchain:

- **Vega SDK, CLI and Virtual Device.** `vega virtual-device start`, `vega project doctor`, `react-native build-vega` and `inputd-cli` drive the build, install and a scripted remote. Our screenshots and end-to-end checks drive the VVD with `inputd-cli`.
- **Vega focus model.** `TVFocusGuideView` and `nextFocus*` on `Pressable`, wrapped by our focus kit. Every element has a visible focus ring, Back is predictable, and sheets trap focus and return it to the tile.
- **Vega libraries.** `@amazon-devices/react-native-svg` for the live drawing board, `react-native-qrcode-svg` for pairing, and `async-storage` for the TV token.
- **Amazon Devices Builder Tools (MCP and Agent Skills).** Configured for Claude Code through `.adbt-config.json` and the project context file. We used its documentation search and Vega guides while building, and the problems we hit are in the friction log and product feedback. **[confirm: name two or three concrete uses]**

## How it uses AWS
**Amazon Bedrock** is the AI layer, called live from our server through the Converse and ConverseStream APIs:

- Tonight picks: Amazon Nova Lite (JSON output, runtime and rating limits in the prompt)
- Phone chat: Amazon Nova Micro, streamed
- *Watched It* quiz: Amazon Nova Pro writes 8 questions, then a second, cold pass answers each one and we keep only those it agrees with
- Measured on Oct 18: Tonight about 1.1 s, chat about 0.5 s, quiz about 2.7 s

Every AI call sits behind one interface with a deterministic fallback, so a Bedrock error or timeout never shows on the TV. Household data is held in the server's memory for this submission; DynamoDB and S3 are not used.

## Open source
`tv-focus-kit` (MIT) is a small React Native TV package. Native Cartesian focus picks the nearest element in the pressed direction, which on an uneven widget grid sends Down to a random neighbour and never returns Up to where you were. The kit computes each neighbour in plain, tested TypeScript, remembers the last cell per row, and wires the result into `nextFocus*`. It has `FocusGrid`, `FocusableCard` and `FocusRing`, and the navigation logic is pure functions you can use without React. **TODO: repo URL once it is public.**

## Challenges we ran into
Honest list; all 15 entries are in the [friction log](friction-log.md).

- Testing focus. The Vega app template's Jest setup loads upstream React Native, so `onFocus` never fires in tests, and its mocks crash. We switched to the Kepler preset.
- Silent rendering bugs on the Virtual Device. A translucent overlay painted over its own children, and `react-native-svg` dropped every stroke added after the first six. We keep a fixed set of always-mounted paths and grow each one.
- No way to screenshot the Virtual Device, so we wrote a capture script around `inputd-cli`, CoreGraphics and `screencapture`.
- Nova made up movie facts. A quiz that is wrong in front of the family is worse than no quiz, so *Our Week* uses no model at all (it reads the calendar), and *Watched It* has a check pass and a hand-checked fallback.

## Accomplishments we're proud of
- A secret vote that is actually secret: the server never sends ballots to the TV or to other phones.
- A game that asks about your own week, built from household data with no model, so the answers are always right.
- A TV app where every element has focus, Back always does the same thing, and nothing needs text input on the TV.
- 15 friction-log entries with workarounds, written as we hit them.

## What we learned
- On TV, the second screen is the phone: text input, private choices and drawing all moved there, and the TV got simpler.
- Server-owned state keeps a multi-screen app honest. Secrets stay on the server until the moment they are revealed.
- Language models are good at taste and bad at facts. Ask them for the first, check the second.

## What's next
- Persist households and the family league (the server holds them in memory today).
- A Polly line on the TV and hold-to-talk on the phone (Transcribe).
- Echo Show as a second display through an Alexa skill, which we researched ([echo-show.md](../research/echo-show.md)).
- Personalisation onboarding: per-person tastes that feed Tonight.

## Built with
React Native for Vega · Vega OS · Vega SDK 0.24 · Vega Virtual Device · Amazon Devices Builder Tools MCP · TypeScript · Node.js · WebSocket (`ws`) · React · Vite · Amazon Bedrock (Amazon Nova Micro, Lite, Pro) · AWS SDK for JavaScript · react-native-svg · Open-Meteo · Jest

## Try it
- **Track:** Fire TV. **Mini challenges:** AWS Builder, Open Source.
- **Demo video (under 3 minutes):** TODO YouTube link. Beats at 0:00 problem · 0:12 Who's here · 0:25 live widgets · 0:45 phone joins · 1:15 Tonight and secret veto · 1:45 household quiz · 2:00 Sketch the pick · 2:25 built on Vega · 2:45 close.
- **Code:** TODO GitHub URL. Setup and run steps are in the README.
- **Run it:** TODO judge steps: hosted companion URL and server, the `.vpkg` from GitHub Releases, Vega Virtual Device steps, and the demo household (no keys or sign-ups needed). Not live yet; see the [checklist](checklist.md).
- **Music:** TODO track name, source and licence.
- **Built during the hackathon window:** everything in this repository was written during the hackathon (the repo started Oct 4 with planning docs; first app code Oct 9).

## Product feedback and friction log
Product feedback for every tool is in [product-feedback.md](product-feedback.md). The friction log has 15 entries ([friction-log.md](friction-log.md)).

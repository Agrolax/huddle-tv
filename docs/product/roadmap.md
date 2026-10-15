# Roadmap

Today: Oct 14 · Submit: **Oct 22** · Hard deadline: Oct 23, 3:00pm EDT

Scope locked Oct 14 ([PRD §2](PRD.md#2-pitch)): widgets (clock/weather, family calendar, Bedrock Tonight, profiles), phone companion via QR (switch profile, message the TV, AI chat), one game (Sketch it), simulated smart-home widget. Polly/Transcribe are stretch.

Work ships as one PR per step, each running on the Vega Virtual Device with screenshots in `docs/screenshots/<step>/`.

Edit freely: this is the living plan. Tick boxes as you go. When a date slips, move items down, don't squeeze them.

## Week 0: Setup & spikes (Oct 4–6)
- [x] Check Fire Stick OS → **Fire TV Stick HD (1st gen) = Fire OS 8** (Android 11 based). That stick cannot run a Vega app
- [x] **Platform: Vega OS** (Oct 7). `.adbt-config.json` is `vega_os`. Demo on the Vega Virtual Device; a Vega Stick 4K is optional real hardware
- [x] Submit [AWS credits form](https://forms.gle/GaHFxSbBQNG9Kti6A) (name the Fire TV track). **$250 credits are on the account** as of Oct 7 ($100 sign-up + $150 hackathon). Questions can also be emailed to kmeiss@amazon.com
- [x] Devpost submission draft started ('Untitled'): [edit it](https://devpost.com/submit-to/30992-build-ship-shape-amazon-developer-hackathon/manage/submissions/1217824/edit). Fill in as you build; finalize by Oct 22
- [x] Registered for **Office Hours #1: Tue Oct 6, 1:30–2:30pm EDT** ([Zoom](https://amazon.zoom.us/webinar/register/WN_ny5v5N4GQNGeMMaJRLKerQ)). Ask: launching other apps from ours on Fire OS / Vega, judging of Vega vs Fire OS. **Attended**; our questions weren't answered (ask on Devpost forum / Discord). Notes: [office-hours.md](../research/office-hours.md)
- [ ] Post our two questions (app launching, Vega vs Fire OS judging) on the Devpost forum / Discord
- [ ] **Verify Bedrock access now** (call a model from the new AWS account; other participants got all quotas = 0 with no escalation path, see [community-research.md](../research/community-research.md#7c-devpost-forum-answers-from-the-organizers-emerson-sklar-janet-fang)). If blocked, ask u/AWSSupport and plan a mock mode
- [x] Mac tooling (Oct 7: awscli, Vega prerequisites, Vega Studio extension, AWS Knowledge MCP; **Oct 9: Vega SDK 0.24.12112 + CLI 1.4.4 installed, Vega Virtual Device boots** via `vega virtual-device start`). Installer was blocked on disk space until Oct 9
- [ ] Run the Vega target of `react-native-multi-tv-app-sample` on the Vega Virtual Device (`scripts/fetch-references.sh` clones it)
- [ ] **Spike: app launching.** From a test screen, `Linking.openURL` into Netflix, Prime Video, YouTube (app + a specific title). Record what works in [architecture § App launching](../architecture/architecture.md#4-app-launching)
- [ ] AWS: pick region, enable Bedrock model access, **set a Budget alert** ($25 / $50 / $75), test one Bedrock call and confirm it bills against credits
- [x] Start the [friction log](../submission/friction-log.md)

## Step 1: Shell (Oct 14) ✅
- [x] npm workspaces monorepo, TypeScript everywhere: `apps/tv`, `apps/server`, `apps/companion`, `packages/shared`, `packages/tv-focus-kit`
- [x] `@amazon-devices/*` aligned with `vega project install --fix` (react-native-kepler 2.1.0+rn0.72.0); `vega project doctor` passes
- [x] `tv-focus-kit`: FocusableCard, FocusGrid (deterministic row/column nav, row memory, spans), FocusRing; unit tested
- [x] Home: greeting + Connect phone + 4×2 placeholder widget grid; Who's here; Back goes Home → Who's here → exit
- [x] Theme tokens in `packages/shared`; realtime protocol with a `display` role for future second screens
- [x] Runs on the Vega Virtual Device; D-pad verified; screenshots in [`docs/screenshots/step-1/`](../screenshots/step-1/)
- [x] [Echo Show research](../research/echo-show.md); friction log FL-01–FL-08

## Step 2: Server + pairing (Oct 14) ✅
- [x] `apps/server` WebSocket hub on the shared protocol: pair codes (10 min), TV claim + TV token, session tokens, payload validation, crash-proof handler; 21 server tests. Household still in memory (DynamoDB later)
- [x] TV: reconnecting client (backoff, ping/pong), Connect overlay with QR (`@amazon-devices/react-native-qrcode-svg` 3.0), code and URL, focus trap, Back closes and focus returns to the chip
- [x] TV: `profile:changed` updates Who's here + greeting; `message:new` → 8 s toast + greeting subline
- [x] Companion: join from QR, pick yourself, switch who's watching, send a message (≤ 280)
- [x] LAN networking documented (README › Networking); VVD reaches the Mac on its LAN IP and 10.0.2.2
- [x] Verified end to end: QR decoded from a VVD screenshot → phone-sized browser on the LAN → profile switch + message on the TV ([screenshots](../screenshots/step-2/))
- [ ] Scan with a real phone on the same Wi-Fi (needs a person with a phone)
- [ ] **Verify Bedrock access** (quota-0 risk) before step 4

## Step 3: Widgets live (Oct 16–17)
- [ ] Weather (Open-Meteo), calendar from server, profiles from server, smart home simulated + toggled from the phone

## Step 4: Bedrock (Oct 17–18)
- [ ] Tonight picks for who's here (Nova), phone AI chat; mock mode without AWS

## Step 5: Sketch it (Oct 18–20)
- [ ] Phone canvas → `sketch:stroke` → TV canvas (normalised points), guesses from phones, Bedrock prompts, scores
- [x] Registered for **Office Hours #2: Mon Oct 19, 12–1pm EDT** ([Zoom](https://amazon.zoom.us/webinar/register/WN_kh9CSYi0QtuN31d8nsTuOQ)): bring Sketch it

## Step 6: Ship (Oct 20–22)
- [ ] Focus + Back audit, `amazon-devices-scalable-ui-audit`, judge setup (hosted server + companion live through Nov 20, `.vpkg` + VVD steps)
- [ ] Open Source: publish `tv-focus-kit` (see [checklist](../submission/checklist.md))
- [ ] Oct 20–21: record and edit the [demo video](../submission/demo-script.md)
- [ ] Oct 22: submit everything

## Stretch (only if step 5 is green)
- [ ] Polly line on the TV, Transcribe hold-to-talk on the phone
- [ ] Echo Show as a `display` client via an Alexa skill + `Alexa.Presentation.HTML` ([research](../research/echo-show.md)); first a 30-min WebSocket spike
- [ ] Launch a Tonight pick into its streaming app (`Linking` spike)

## Change log
| Date | Change |
|---|---|
| Oct 4 | Pivoted from party game to Huddle Home; game moved to bonus |
| Oct 4 | AWS credits requested (allow ~5 business days) |
| Oct 5 | Added Polly (voice) + Transcribe (phone voice input) to scope |
| Oct 5 | New AWS account came with $100 sign-up credits (AWS Free Tier, not the hackathon code; $150 hackathon code still pending). Device confirmed Fire OS 8 → Android TV build target, auto-detect installed apps |
| Oct 6 | Office Hours #1: judges may score from video + text alone; one-click judge setup; hosted demo live through judging; focus beats breadth. Ring overlay flagged as "obvious". Open decision: multi-turn voice Tonight ([notes](../research/office-hours.md)) |
| Oct 6 | Community/platform research ([community-research.md](../research/community-research.md)): new Fire TV Stick 4K ships Vega OS 2.0 and its launch complaints (can't reorder apps, no sideloading) back the household-home pitch. Open: Vega build as stretch vs Fire OS only |
| Oct 6 | Wider research: Fire TV's 2026 update already has app reorder/pin 20, Alexa+ discovery from history, phone watchlists, Photos ambient. Multi-profile household features are the gap, so lead with those and demote plain app row / photo slideshow / Ring tile. Bedrock quota-0 risk on new accounts: verify access ([notes](../research/community-research.md)) |
| Oct 7 | Installed Vega prerequisites, AWS CLI, Vega Studio extension, AWS Knowledge MCP. Vega SDK blocked on disk space (4 GB free; installer wants ~20 GB) |
| Oct 7 | **Build target is Vega OS**, not Fire OS. The Stick HD (Fire OS 8) cannot run it. App shortcuts launch through `Linking`, not Android package listing |
| Oct 7 | Phased build. Echo Dot Max / Echo Show 8 run Vega, but the Echo is a voice client (Alexa → same API), not a second app. Games move to phase 4 with a contributor manifest. Figma starts at three frames |
| Oct 7 | AWS credits confirmed at $250. Spend them on Nova, Polly, Transcribe, DynamoDB, S3, and a small Lightsail box |
| Oct 9 | Phase 1 TV app scaffolded (`apps/tv`): Who's here, Home, Launching. Debug vpkg builds on SDK 0.24 / RN 0.72. Next: run on VVD |
| Oct 9 | Vega SDK 0.24.12112 (CLI 1.4.4) installed; Vega Virtual Device starts and shows in `vega device list`. Added phone↔TV connection ideas to the [ideas backlog](ideas-backlog.md) |
| Oct 14 | **Scope locked**: widgets (clock/weather, family calendar, Bedrock Tonight, profiles), phone companion via QR (switch profile, message TV, AI chat), Sketch it (phone draws, TV shows, phones guess, Bedrock prompts), simulated smart-home widget. Polly/Transcribe stretch. Board, photos, agenda, apps row, trivia, Echo voice phase dropped or moved to stretch. Plan is now steps, one PR each |
| Oct 14 | Step 1 shell: npm workspaces monorepo, `tv-focus-kit`, home grid on the VVD, shared protocol with a `display` role. Echo Show researched: no Vega app path; Alexa skill + HTML web app is the route ([echo-show.md](../research/echo-show.md)) |
| Oct 14 | Step 2 pairing: server pair codes + TV claim/tokens + validation, TV Connect overlay with QR, live profile switch and phone → TV messages. QR lib, async-storage and mmkv aren't in `vega project install`'s OS 1.2 profile even though the docs list them (FL-09); installed by version. Hint text raised to 24 px |
| Oct 15 | Demo script rewritten for the locked scope: Who's here, live widgets, phone via QR (profile, message, calendar, lamp), Tonight + AI chat (after step 4), Sketch it (after step 5), architecture slide. Cut apps row, ambient photos and streaming-app launch. Added shot list, macOS recording how-to and export checklist ([demo-script.md](../submission/demo-script.md)) |

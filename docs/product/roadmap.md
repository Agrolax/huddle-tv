# Roadmap

Today: Oct 4 · Submit: **Oct 22** · Hard deadline: Oct 23, 3:00pm EDT

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
- [ ] Start the [friction log](../submission/friction-log.md)

## Phase 1: Design + TV home (now → Oct 10)
Do not start phase 2 until this plays on the Vega Virtual Device.
- [ ] Figma, these three frames only: Who's here, Home (apps row + Clock/Weather + Board), launching overlay. Low-fi is in [wireframes.html](../design/wireframes.html)
- [x] Design tokens (colour, type scale, spacing, focus style) → `packages/shared` + `apps/tv/src/theme.ts`
- [x] `apps/tv` Vega RN 0.72 app: Who's here → Home → Launching (`Linking`). Debug `.vpkg` builds
- [x] Clock/Weather widget and a static Board tile
- [ ] Run on Vega Virtual Device (checkpoint)
- **Checkpoint Oct 10:** home on the Vega Virtual Device, D-pad works, one real app launches

## Phase 2: Phone + Amazon AI (Oct 11–16)
- [ ] `apps/server`: household, profiles, board, events, photos (DynamoDB + S3), WebSocket push
- [ ] `apps/companion`: QR pairing, post note, add event, send photo
- [ ] Board, Agenda, Photos live on the TV
- [ ] Tonight picker: **Bedrock** + watch-provider data → launch
- [ ] Plain-English events (Bedrock), hold-to-talk (**Transcribe**), one spoken line on the TV (**Polly**)
- [ ] Launch logging → apps row reorder
- **Checkpoint Oct 16:** phone post shows on the TV, and Tonight launches an app. If not, skip phases 3 and 4.

## Phase 3: Echo voice (Oct 17–19)
- [ ] Alexa path into the same household API: post a board note, ask what's on tonight
- [ ] Prove it with a spoken phrase that appears on the TV. Echo Dot Max is voice only; do not build an Echo screen
- [x] Registered for **Office Hours #2: Mon Oct 19, 12–1pm EDT** ([Zoom](https://amazon.zoom.us/webinar/register/WN_kh9CSYi0QtuN31d8nsTuOQ)): bring the near-final demo

## Phase 4: One game + a contributor slot (only if phase 2 is green)
- [ ] Games row on Home, one trivia game (phones as controllers, Bedrock questions)
- [ ] `games/<id>/manifest.json` so another person can add a game without editing the home screen. That folder is the open-source entry
- [ ] Motion + focus audit, Back audit
- [ ] Judge-ready setup: hosted server + companion (live through Nov 20), `.vpkg` plus Vega Virtual Device steps, mock mode without AWS
- [ ] Oct 20–21: record and edit the [demo video](../submission/demo-script.md) (Polly voice-over)
- [ ] Oct 22: submit everything

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

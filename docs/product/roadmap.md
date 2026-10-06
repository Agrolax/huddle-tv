# Roadmap

Today: Oct 4 · Submit: **Oct 22** · Hard deadline: Oct 23, 3:00pm EDT

Edit freely: this is the living plan. Tick boxes as you go. When a date slips, move items down, don't squeeze them.

## Week 0: Setup & spikes (Oct 4–6)
- [x] Check Fire Stick OS → **Fire TV Stick HD (1st gen) = Fire OS 8** (Android 11 based). `.adbt-config.json` set to `fire_os`
- [x] Submit [AWS credits form](https://forms.gle/GaHFxSbBQNG9Kti6A) (name the Fire TV track). **$150 hackathon code still pending** as of Oct 6 (≤5 business days; arrives by email). Questions can also be emailed to kmeiss@amazon.com (per the Zoom confirmation)
- [x] Devpost submission draft started ('Untitled'): [edit it](https://devpost.com/submit-to/30992-build-ship-shape-amazon-developer-hackathon/manage/submissions/1217824/edit). Fill in as you build; finalize by Oct 22
- [x] Registered for **Office Hours #1: Tue Oct 6, 1:30–2:30pm EDT** ([Zoom](https://amazon.zoom.us/webinar/register/WN_ny5v5N4GQNGeMMaJRLKerQ)). Ask: launching other apps from ours on Fire OS / Vega, judging of Vega vs Fire OS
- [ ] Mac tooling: Android Studio (SDK + emulator), JDK 17, `adb` (see README › Setup)
- [ ] Stick: Settings → My Fire TV → About → press Select on the device name 7× → Developer Options → **ADB debugging ON**, **Apps from unknown sources ON**
- [ ] `adb connect <stick-ip>:5555` (IP in Settings → My Fire TV → About → Network), accept the prompt on the TV
- [ ] Run `react-native-multi-tv-app-sample` (Android TV target) on the stick (`scripts/fetch-references.sh` clones it)
- [ ] **Spike: app launching.** From a test screen, open Netflix, Prime Video, YouTube (app + a specific title). Record what works in [architecture § App launching](../architecture/architecture.md#4-app-launching)
- [ ] AWS: pick region, enable Bedrock model access, **set a Budget alert** ($25 / $50 / $75), test one Bedrock call and confirm it bills against credits
- [ ] Start the [friction log](../submission/friction-log.md)

## Week 1: Design + shell (Oct 5–10)
- [ ] Figma: Home, Who's here, Tonight, Board expanded, Ambient, phone quick actions
- [ ] Design tokens (colour, type scale, spacing, focus style) → `packages/shared` theme
- [ ] `apps/tv` from the multi-TV sample: profile picker → home layout → apps row launching apps
- [ ] Widget framework (tile + expanded view contract) + Clock/Weather widget
- **Checkpoint Oct 10:** home screen running on the stick and launching at least one real app

## Week 2: Data, phone, AI (Oct 11–16)
- [ ] `apps/server`: household, profiles, board, events, photos (DynamoDB + S3), WebSocket push
- [ ] `apps/companion`: QR pairing, post note, add event, send photo
- [ ] Board, Agenda, Photos widgets live
- [ ] Launch logging → apps row reorder + "suggested now" chip
- [ ] Tonight picker: Bedrock + watch-provider data → launch
- **Checkpoint Oct 16:** full MVP loop works end to end. If not, cut all "should haves".

## Week 3: Polish & ship (Oct 17–22)
- [ ] Should-haves in order: ambient mode → daily brief → NL event input → edit mode → sports
- [ ] Motion + sound pass, focus audit, Back audit
- [ ] Open Source: extract package or open a PR (see [checklist](../submission/checklist.md))
- [ ] Bonus (only if green on Oct 17): Huddle Games
- [x] Registered for **Office Hours #2: Mon Oct 19, 12–1pm EDT** ([Zoom](https://amazon.zoom.us/webinar/register/WN_kh9CSYi0QtuN31d8nsTuOQ)): bring the near-final demo
- [ ] Oct 20–21: record and edit the [demo video](../submission/demo-script.md)
- [ ] Oct 22: submit everything

## Change log
| Date | Change |
|---|---|
| Oct 4 | Pivoted from party game to Huddle Home; game moved to bonus |
| Oct 4 | AWS credits requested (allow ~5 business days) |
| Oct 5 | Added Polly (voice) + Transcribe (phone voice input) to scope |
| Oct 5 | New AWS account came with $100 sign-up credits (AWS Free Tier, not the hackathon code; $150 hackathon code still pending). Device confirmed Fire OS 8 → Android TV build target, auto-detect installed apps |

# Roadmap

Today: Oct 4 · Submit: **Oct 22** · Hard deadline: Oct 23, 3:00pm EDT

Edit freely: this is the living plan. Tick boxes as you go. When a date slips, move items down, don't squeeze them.

## Week 0: Setup & spikes (Oct 4–6)
- [ ] Check Fire Stick OS: Settings → My Fire TV → About (Vega or Fire OS) → update `.adbt-config.json`
- [x] Submit [AWS credits form](https://forms.gle/GaHFxSbBQNG9Kti6A) (name the Fire TV track)
- [ ] Enable developer mode on the stick (ask Claude: "help me enable developer mode")
- [ ] Install Vega SDK if Vega (ask Claude: "Help me set up Vega SDK")
- [ ] Run `react-native-multi-tv-app-sample` on the stick (`scripts/fetch-references.sh` clones it)
- [ ] **Spike: app launching.** From a test screen, open Netflix, Prime Video, YouTube (app + a specific title). Record what works in [architecture § App launching](../architecture/architecture.md#4-app-launching)
- [ ] AWS: Bedrock model access, pick region
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
- [ ] Oct 20–21: record and edit the [demo video](../submission/demo-script.md)
- [ ] Oct 22: submit everything

## Change log
| Date | Change |
|---|---|
| Oct 4 | Pivoted from party game to Huddle Home; game moved to bonus |
| Oct 4 | AWS credits requested (allow ~5 business days) |

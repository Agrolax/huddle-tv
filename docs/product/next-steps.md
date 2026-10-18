# Next steps (written Oct 18, to resume later)

State: steps 1–6 are merged to `main` (PRs #1–#11), `npm run check` passes, and the submission drafts are in [docs/submission/](../submission/). Only `main` exists as a branch. Nothing is submitted, recorded or hosted yet.

**Ownership.** You are redesigning the screens and deciding the workflow. Nothing below changes the UI or picks a workflow unless you ask. Where an item needs your call, it says **You decide**.

Hard dates: submit **Oct 22**, hard deadline **Oct 23, 3:00pm EDT**. Recording needs a stable UI, so the redesign has to be merged before it.

## Decisions waiting on you
| # | Decision | Options | Default if you do not decide |
|---|---|---|---|
| D1 | AWS story. Docs list DynamoDB, S3, Lightsail and Polly; the code calls only Bedrock | Cut the claims · add Polly (video narration, or in-app) · add DynamoDB. S3 has no job left | Cut the claims. Polly on the video narration only |
| D2 | Family league ([family-league.md](family-league.md)) | JSON file · DynamoDB · "within a session" | "Within a session" wording; no new code |
| D3 | Repo visibility | Public + MIT LICENSE · private + invite the six reviewers at submit time | Public + MIT (the Open Source challenge needs a public repo anyway) |
| D4 | Hosted demo | Small Lightsail/EC2 box running server + companion · none (video only) | None. Judges may score from text and video alone, but one-click setup was advised at Office Hours |
| D5 | Open Source entry | B: publish `tv-focus-kit` as its own repo · A: a PR to a popular RN TV library | B |
| D6 | Redesign scope | Which screens change, and whether the phone changes too | Yours |

## Schedule
| When | What | Who |
|---|---|---|
| Sun Oct 18 | Drafts merged (done). Decide D1–D5 | You |
| Mon Oct 19 | Office Hours #2, 12–1pm EDT: ask about judge setup for Vega apps; bring game night. **Redesign merged by the evening** so the video shows the final UI | You (+ me on request) |
| Tue Oct 20 | Focus + Back audit on the VVD after the redesign. `amazon-devices-scalable-ui-audit` skill. Fix what it finds. Pre-warm Tonight and the quiz. Record the TV, phone and couch shots | You + me |
| Wed Oct 21 | Record voiceover (Polly if D1 says so). Edit, caption, export. Hosted demo and `.vpkg` release if D4 says so. Make the repo public if D3 says so; publish the focus kit | You + me |
| Thu Oct 22 | Fill the Devpost form from [devpost-description.md](../submission/devpost-description.md). Resolve every `[confirm]` and `TODO`. Read the text against the code. Submit | You |
| Fri Oct 23 | Buffer only. Deadline is 3:00pm EDT | |

## Work I can take on request (nothing started)
1. **Screen and state inventory** from the code: every TV and phone screen with its loading, empty, error and focus states, as one Markdown table. About an hour. Useful as the redesign checklist.
2. **Cut the AWS claims** in README, PRD and architecture.md, and draw an accurate architecture diagram (TV ↔ WebSocket server ↔ Bedrock, phones via QR). Small.
3. **README refresh**: the status line still says "step 1".
4. **Polly narration**: a script that turns the voiceover table into MP3 files. A few hours of work, mostly choosing a voice. In-app Polly needs a Vega audio-playback spike first and is not recommended.
5. **League persistence**: JSON file (about an hour) or DynamoDB (a few hours).
6. **Publish `tv-focus-kit`**: LICENSE, example app, clean-install check, comparison with other RN TV focus libraries.
7. **Judge setup**: hosted server, companion build, `.vpkg` pointed at the hosted `wss://` URL, VVD steps, seeded household.
8. **Vega audits**: focus/Back walk-through and the scalable UI audit.
9. **Friction log**: add entries as you hit snags while redesigning (it earns up to +10%).

## Known gaps in the shipped build
- Real-phone QR scan was never tested (only a phone-sized browser). Needs a person with a phone on the same Wi-Fi.
- Watched It invents facts on Nova; use a hand-checked title for the demo.
- Server state is in memory. A restart wipes households and the league; phones must scan the QR again.
- The TV's server URL is baked in at build time ([README › Networking](../../README.md)). A judge build needs its own URL.
- The VVD clock runs in UTC (FL-13), so the clock tile is off in recordings.
- No AWS budget alert is set (needs your OK).
- The Home tile layout and the old wireframes predate the Oct 17 scope change.

## How to resume
```bash
git checkout main && git pull
npm install
npm run check                 # typecheck + tests, all workspaces
npm run dev:server            # ws on the LAN IP; HUDDLE_AI=bedrock for live Bedrock (needs `aws login`)
npm run dev:companion         # phone web app
source ~/vega/env && vega virtual-device start
npm run build:tv && npm run tv:install && npm run tv:launch
```
One PR per step, branch from `main`, no co-author trailers, screenshots in `docs/screenshots/<step>/`.

## Where things are
- Plan and dates: [roadmap.md](roadmap.md). Scope: [PRD.md](PRD.md).
- Submission: [checklist](../submission/checklist.md) (blockers at the top), [demo script](../submission/demo-script.md), [product feedback](../submission/product-feedback.md), [Devpost text](../submission/devpost-description.md), [friction log](../submission/friction-log.md).
- Research: [uniqueness.md](../research/uniqueness.md), [differentiation.md](../research/differentiation.md), [office-hours.md](../research/office-hours.md).
- Screens and states for the redesign: [docs/screenshots/](../screenshots/), [design guide](../design/design-guide.md), [wireframes](../design/wireframes.html), [game wireframes](../design/wireframes-games.html), tokens in `packages/shared/src/theme.ts`, TV UI in `apps/tv/src/`, phone UI in `apps/companion/src/`.

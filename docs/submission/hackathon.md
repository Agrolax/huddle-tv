# Hackathon notes (archived)

Huddle was built for the [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) (Oct 2026), Fire TV track. It was not submitted. The notes below are the rules, prizes, judging criteria and the submit checklist as they stood on Oct 23, 2026. The portfolio page is the [README](../../README.md).

## Hackathon at a glance

**Build, Ship, Shape: Amazon Developer Hackathon** · [site](https://amazonappdev2026.devpost.com/) · [rules](https://amazonappdev2026.devpost.com/rules) · [resources](https://amazonappdev2026.devpost.com/resources)

| Date | What |
|---|---|
| **Oct 23, 2026 · 12:00pm PT / 3:00pm EDT** | Submission deadline (we aim for Oct 22) |
| Oct 6, 1:30pm EDT · Oct 19, 12:00pm EDT | Live office hours with the Amazon team ([#1](https://amazon.zoom.us/webinar/register/WN_ny5v5N4GQNGeMMaJRLKerQ) · [#2](https://amazon.zoom.us/webinar/register/WN_kh9CSYi0QtuN31d8nsTuOQ)) |
| Oct 21, 12:00pm PT | AWS credits form closes (✅ requested; **$250 active** as of Oct 18: $150 hackathon + $100 Free Tier) |
| Nov 9 – Nov 20 | Judging |
| ~Dec 3 | Winners announced |

### Tracks (a project can win **one** track prize)
| Track | What you build | Prizes |
|---|---|---|
| **Fire TV** ← *our track* | Demo-ready app on Fire OS or Vega OS (any framework). Priority: AI-enhanced viewing, sports, fitness, family entertainment, multi-modal UX, computer vision | 🥇 $25,000 + $15k AWS credits + meeting with Amazon team · 🥈 $15,000 + $5k credits · 🥉 $4,000 + $1k credits |
| Alexa+ | MCP server (spec 2025-11-25+, Streamable HTTP) or Agent Skill, or a simulated Alexa+ web app | 🥇 $25,000 + $15k · 🥈 $15,000 + $5k · 🥉 $4,000 + $1k |
| Bee (Wearable AI) | Project using live data from a Bee device / Apple Watch with Bee | 🥇 $12,000 + meeting · 🥈 $8,000 |
| Ring | App using Ring APIs, SDKs or simulator | 🥇 $12,000 + meeting · 🥈 $8,000 |

### Mini challenges (a project can win **one**, on top of its track)
| Challenge | Requirement | Prize | Our plan |
|---|---|---|---|
| **AWS Builder** | Use AWS services with documented integration (Bedrock, AgentCore, Strands, Kiro, SageMaker…). Kiro alone qualifies. | $5,000 + $5k credits + meeting | Amazon Bedrock (Nova) for Tonight picks, phone AI chat and Watched It quiz questions. Polly, Transcribe, DynamoDB, S3 and Lightsail are not used |
| **Open Source** | New open-source project or a PR/fork/branch to a public repo, made during the hackathon | $5,000 + $5k credits + meeting | `packages/tv-focus-kit`: D-pad focus primitives for React Native TV (MIT) |

### Judging (equally weighted, after a pass/fail viability check)
1. **Tech implementation**: how well it's built and how well it uses the platform
2. **Design**: complete, coherent experience; interaction model fits the device
3. **Potential impact**: credible customer need, audience beyond the hackathon
4. **Quality of idea**: creative, not "obvious". For Fire TV, *obvious* = basic streaming UI / video player / remote game; *creative* = AI viewing that adapts to household patterns, multi-modal voice + D-pad + visual

**Bonus:** friction log entries can add **up to 10%** to the final score → [`docs/submission/friction-log.md`](friction-log.md)

### What we submit
Text description · GitHub repo · demo video < 3 min (running on the device) · product feedback for every tool · track + mini challenges · optional friction log + feature requests. Full list: [`docs/submission/checklist.md`](checklist.md)

## Next steps to submit (Oct 23, deadline 3:00pm EDT)
The full ordered list is [`docs/submission/noon-runbook.md`](noon-runbook.md); the state of every item is in [`docs/submission/checklist.md`](checklist.md).

1. Watch the rendered demo video (`.tmp/demo/out/huddle-home-demo.mp4`, 2:27, silent, captioned).
2. Optional: `aws login`, then re-record with `HUDDLE_AI=bedrock` so the AWS Builder shot shows live Nova.
3. Upload to YouTube as Public and copy the link.
4. Make the repo public (`gh repo edit Agrolax/huddle-tv --visibility public --accept-visibility-change-consequences`), or invite the reviewers at submit time. Check the About box shows the MIT license.
5. Resolve the `[confirm]` lines in `docs/submission/product-feedback.md` (onboarding times, which Builder Tools calls you used, Bedrock cost) and delete the Kiro section if unused.
6. Fill Devpost from `docs/submission/devpost-description.md`: Fire TV track, AWS Builder + Open Source challenges, video link, gallery stills from `docs/submission/gallery/`, product feedback, friction log.
7. Preview as a judge (video plays logged out, repo opens, license shows), submit, and screenshot the confirmation.

Still open and optional: an AWS Budget alert, a hosted demo, a real-phone QR test, the focus and Back audit, and the redesign (below).

## Redesigning the UI, then putting the demo back
Redesign the screens first, then regenerate everything the submission shows. Nothing in `scripts/demo/` needs editing unless the layout moves.

1. **Design in code.** TV screens are in `apps/tv/src/screens` and `apps/tv/src/components`, the phone in `apps/companion/src`, tokens in `packages/shared/src/theme.ts`. The checklist of every screen and state is [`docs/design/screen-inventory.md`](../design/screen-inventory.md). Keep: 1920×1080, 5% safe area, a visible focus ring on every focusable element, no text input on the TV.
2. **Check it.** `npm run check`, then `npm run build:tv && npm run tv:install && npm run tv:launch` on the Vega Virtual Device. Press through every screen with the remote and Back.
3. **Walk the demo without recording.** `node scripts/demo/record.mjs --dry` plays the whole script and saves one screenshot per beat to `.tmp/demo/dry/`. If a beat lands on the wrong control, fix the key presses in `scripts/demo/record.mjs` (they are grouped by beat: Who's here, Home, Connect, Tonight, quiz, Sketch). A different grid layout is the usual cause.
4. **Record and render.** `node scripts/demo/record.mjs && node scripts/demo/assemble.mjs` writes `.tmp/demo/out/huddle-home-demo.mp4` (about 8 minutes). For the live Amazon Nova take run `aws login` and set `HUDDLE_AI=bedrock` on both commands. Start the server before launching the TV app.
5. **Replace the stills.** Copy the new `.tmp/demo/dry/` screenshots over `docs/submission/gallery/` (same file names: 01-home, 02-tonight-ends-by, 03-secret-vote-result, 04-household-quiz, 05-sketch-the-pick, 06-phones-join-by-qr). `scripts/vvd-capture.sh out.png KEY_RIGHT …` takes a single one.
6. **Put the docs back in step.** Update `docs/design/screen-inventory.md` and the design guide, add a row to the roadmap change log, log any Vega snag in `docs/submission/friction-log.md`, and re-read `docs/submission/devpost-description.md` against the new UI (beat timestamps come from the new video).
7. **Ship it.** One PR from a branch off `main`, no co-author trailer. Upload the new video, replace the gallery images on Devpost, and resubmit before the deadline (Devpost allows edits until Oct 23, 3:00pm EDT).

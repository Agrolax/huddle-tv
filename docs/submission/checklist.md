# Submission checklist

Due **Oct 23, 2026 · 3:00pm EDT**. Target **Oct 22**. Edits are allowed on Devpost until the deadline, so submit a complete draft early and polish after.

Status as of **Oct 21**: written = a draft exists in this folder. AWS claims, the README status line, the architecture diagram and the root LICENSE were updated Oct 21. The repo is still private. Nothing is published, recorded or submitted yet.

## Blockers (fix these first; each one can fail the submission)
- [ ] **Repo is still private.** MIT `LICENSE` is at the repo root (Oct 21). Visibility was not changed. To clear this: make the repo public, or invite the reviewers below at submit time.
- [ ] **No demo video.** Record Oct 20–21 from [demo-script.md](demo-script.md). It must be public on YouTube/Vimeo, under 3:00, English, show the app on the VVD or a device, and use no copyrighted music.
- [ ] **No judge setup.** Judges may only read and watch, but if they run it they need: a hosted server + companion that stays up through Nov 20, a `.vpkg` in GitHub Releases built against the hosted server's `wss://` URL (the TV URL is baked in at build time by `apps/tv/scripts/write-config.mjs`), VVD steps, and a seeded demo household. No API keys or sign-ups for them.
- [x] **Docs match the AWS the code uses (Oct 21).** Only Bedrock is called. README, PRD and architecture no longer list DynamoDB, S3, Lightsail or Polly as built. Household and league state are in memory. The Devpost text and product feedback already said Bedrock only.

## Required by Devpost
- [x] **Text description** (written): [devpost-description.md](devpost-description.md). Fill the `TODO` links (video, repo, judge steps, music) and the `[confirm]` line about Builder Tools use
- [ ] **GitHub repo** with setup and run steps in the README
  - [x] LICENSE file at the repo root (MIT, Oct 21). The About section will not show it until the repo is public
  - [ ] Public, **or** private + add `testing@devpost.com` and the Amazon reviewers **at submit time** (invites expire after 7 days): `chris-trag`, `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar`
  - [x] README status line updated to steps 1–6 (Oct 21). Architecture diagram: [architecture.md](../architecture/architecture.md), linked from the README
  - [ ] No secrets in git: `git ls-files` shows only `.env.example` files, and a pattern scan for AWS and API keys found nothing on Oct 18. Re-run before submitting
- [ ] **Demo video** under 3 min ([demo-script.md](demo-script.md)): problem → solution working → who it's for → Fire TV / Vega tools on screen
- [x] **Product feedback** (written): [product-feedback.md](product-feedback.md). Resolve every `[confirm]` and either list the Builder Tools calls you used or cut that sentence. Delete the Kiro / AWS Knowledge MCP section if you did not use them
- [ ] **Track:** Fire TV
- [ ] **Mini challenges:** AWS Builder, Open Source
- [ ] **Built-during-the-hackathon statement:** in the description (first app code Oct 9, repo started Oct 4)
- [ ] **Built With** tags: React Native for Vega, Vega OS, Amazon Bedrock, TypeScript, Node.js, React, Vite (full list in the description file)
- [ ] **Gallery images:** 3–5 stills from `docs/screenshots/` (Home, Tonight with "Ends by", vote result, quiz question, Sketch the pick board) plus the architecture slide
- [ ] **Music** track, source and licence noted in the description

## AWS Builder
- [x] Bedrock is called live from the server (Nova Micro / Lite / Pro; verified Oct 18). The Devpost text says which service does what
- [ ] Show a live Bedrock call in the video (server log line with `source: bedrock`; shot 12b)
- [x] Architecture diagram matches the code (Oct 21): [architecture.md](../architecture/architecture.md), linked from the README. TV (Vega) ↔ WebSocket server ↔ Bedrock, phones via QR. No DynamoDB, S3 or Polly
- [ ] Set an AWS Budget alert ($25 / $50 / $75). Needs your OK, not set yet
- [ ] Add the final credits used to the product feedback (Bedrock section)

## Open Source
Pick **B** (a new repo is the realistic option in four days); A (a PR to a popular RN TV library) scores higher if one can land with tests.
- [ ] **B.** Publish `packages/tv-focus-kit` as its own public repo (or a public folder with its own LICENSE): LICENSE file (MIT is already in `package.json`), README, a runnable example, tests passing (22 today)
  - [ ] `package.json`: `main` points at `src/index.ts`. Fine for Metro, but say so in the README or add a build
  - [ ] Check it installs and imports from a clean app outside this monorepo
- [ ] Fields: contribution URL, project repo URL, GitHub username (`Agrolax`), what you did / how it works / why it matters (use the Open source paragraph in the description)
- [ ] (Optional) check whether it also counts for Hacktoberfest

## Bonus
- [x] **Friction log**: 15 entries (FL-01 to FL-15) in [friction-log.md](friction-log.md). Add new ones as they happen; up to +10%
- [x] **Feature requests**: table at the end of [product-feedback.md](product-feedback.md)

## Step 7 work that feeds the submission (from the [roadmap](../product/roadmap.md))
- [ ] Focus + Back audit on the VVD, every screen
- [ ] Run the `amazon-devices-scalable-ui-audit` skill and fix what it finds
- [ ] Pre-warm Tonight and the quiz before recording; use a hand-checked *Watched It* title
- [ ] Office Hours #2, Mon Oct 19 12–1pm EDT: ask about judge setup for Vega apps and whether a hosted companion is enough; bring game night
- [ ] Post the two unanswered Office Hours #1 questions (app launching, Vega vs Fire OS judging) on the Devpost forum or Discord

## Final pass (Oct 22)
- [ ] Open the Devpost preview as a judge: every field filled, video plays in a private window, repo link opens, license shows
- [ ] Read the description against the code once more. Every claim is something the app does today
- [ ] Hosted demo URL works from a phone on cellular
- [ ] Submit. Screenshot the confirmation

## Tips from Devpost's "Strong Submission Tips" email (Oct 5)
- Feedback must **name the tool** for every point ("the docs were confusing" alone doesn't help)
- Give the project a **memorable, specific name**
- **No API keys in code**: `.env` is gitignored; check the repo before submitting
- Make the track tool **impossible to miss**: name Fire TV / Vega in the description, in **Built With**, and clearly in the video
- Treat the video as a **pitch**: problem → solution working → who it's for → how it uses the track's tool

## Tips from Office Hours #1 (Oct 6), see [office-hours.md](../research/office-hours.md)
- Judges may score from the **text + video alone**, so the video has to work as a trailer
- **Judge setup ≈ one click**: no API keys or sign-ups for them; seeded demo household + demo credentials; `.vpkg` and Vega Virtual Device steps in GitHub Releases
- **Hosted demo (server + companion) stays live through judging (Nov 20)**
- Show **live Bedrock calls** on screen; any architecture diagram must be accurate, not AI filler

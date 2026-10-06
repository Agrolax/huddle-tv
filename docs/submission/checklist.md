# Submission checklist

Due **Oct 23, 2026 · 3:00pm EDT** (target Oct 22).

## Required
- [ ] **Text description**: what it does + how it works (draft in this folder first)
- [ ] **GitHub repo** with setup/run instructions in README
  - Public + LICENSE file (detectable in the About section), **or**
  - Private + add `testing@devpost.com` and the Amazon reviewers **at submit time** (invites expire after 7 days): `chris-trag`, `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar`
- [ ] **Demo video** < 3 min, public on YouTube/Vimeo, English, shows the app **running on the Fire TV device or Vega simulator**. No copyrighted music. See [demo-script.md](demo-script.md).
- [ ] **Product feedback** for every tool/SDK used, including the AWS services: [product-feedback.md](product-feedback.md)
- [ ] **Track:** Fire TV
- [ ] **Mini challenges:** AWS Builder, Open Source
- [ ] If anything pre-existed: explain what was built during the window (everything here is new)

## AWS Builder
- [ ] Describe which AWS services were used and how (in the product feedback answer)
- [ ] Architecture diagram in README showing Bedrock / DynamoDB / S3

## Open Source
Pick one (a contribution to a popular repo likely scores higher):
- [ ] **A.** PR/fork adding something meaningful to a RN TV library you used (e.g. Vega support, a focus bug fix) with tests
- [ ] **B.** New repo: extract `packages/tv-focus-kit` (or a widget kit) with a LICENSE, README and example
- [ ] Fields: contribution URL, project repo URL, GitHub username (`Agrolax`), what you did / how it works / why it matters
- [ ] (Optional) check whether it also counts for Hacktoberfest

## Bonus
- [ ] **Friction log** entries ([friction-log.md](friction-log.md)): up to +10%
- [ ] Feature requests (in product-feedback.md)

## Tips from Devpost's "Strong Submission Tips" email (Oct 5)
- Feedback must **name the tool** for every point ("the docs were confusing" alone doesn't help)
- Give the project a **memorable, specific name**
- **No API keys in code**: `.env` is gitignored; check the repo before submitting
- Make the track tool **impossible to miss**: name Fire TV / Vega in the description, in **Built With**, and clearly in the video
- Treat the video as a **pitch**: problem → solution working → who it's for → how it uses the track's tool

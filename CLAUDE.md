# Huddle Home

Family home-screen app for Fire TV on Vega OS.
Locked scope (Oct 14): widgets (clock/weather, family calendar, Bedrock Tonight picks, profiles), phone companion via QR (switch profile, message the TV, AI chat), one game "Sketch it" (phone draws, TV shows, phones guess), simulated smart-home widget. Polly/Transcribe are stretch.
Sharpened Oct 17 (`docs/research/differentiation.md`): game night = household quiz (Kahoot-style, questions about your movie/week) + Sketch the pick, on one engine with a family league; Tonight adds secret veto (private phone votes) and bedtime-aware picks; app launching demoted.

## Where things are
- Product: `docs/product/PRD.md` (what/why), `local/hackathon/roadmap.md` (plan, checkboxes; local only), `docs/product/ideas-backlog.md`, `docs/product/onboarding-plan.md` (proposal)
- Tech: `docs/architecture/architecture.md`
- Design: `docs/design/design-guide.md`, `docs/design/wireframes.html`
- Links/samples: `docs/research/references.md`; sample apps cloned in `reference/` (gitignored; run `scripts/fetch-references.sh`)
- Gallery: `docs/gallery/`. Hackathon notes (roadmap, next steps, redesign brief, checklist, friction log, product feedback, demo script) are in `local/hackathon/`: git-ignored, never commit them

## Code layout
- npm workspaces; `npm run check` = typecheck + tests for every workspace
- `apps/tv`: React Native for Vega (SDK 0.24, RN 0.72). Build/run: see README › Apps. Screenshots: `scripts/vvd-capture.sh`
- `apps/companion`: React + Vite phone web app
- `apps/server`: Node + TS API, WebSocket, Amazon Bedrock (Nova). Household state is in memory
- `packages/shared`: theme tokens + realtime protocol (`protocol.ts`, roles tv/phone/display/voice); `packages/tv-focus-kit`: D-pad focus primitives (open-source entry)

## Working rules
- When the plan or scope changes, update the PRD/roadmap (and the roadmap change log) in the same change.
- When a tool/SDK causes friction, add an entry to `local/hackathon/friction-log.md`.
- TV UI: 1920×1080, 5% safe area, visible focus on every focusable element, no text input on TV.
- Never commit secrets; use `.env` with a committed `.env.example`.

## Amazon Devices Builder Tools context
@.claude/amazon-devices/CLAUDE.md

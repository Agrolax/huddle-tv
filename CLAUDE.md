# Huddle Home

Family home-screen app for Fire TV (Amazon Developer Hackathon, Fire TV track, due Oct 23 2026 3pm EDT).
Widgets + profiles + AI "Tonight" picker + one-press launch into existing streaming apps, with a phone web companion.

## Where things are
- Product: `docs/product/PRD.md` (what/why), `docs/product/roadmap.md` (plan, checkboxes), `docs/product/ideas-backlog.md`
- Tech: `docs/architecture/architecture.md`
- Design: `docs/design/design-guide.md`, `docs/design/wireframes.html`
- Links/samples: `docs/research/references.md`; sample apps cloned in `reference/` (gitignored; run `scripts/fetch-references.sh`)
- Submission: `docs/submission/` (checklist, friction log, product feedback, demo script)

## Code layout
- `apps/tv`: React Native TV app (Vega + Fire OS), based on `reference/react-native-multi-tv-app-sample`
- `apps/companion`: React + Vite phone web app
- `apps/server`: Node + TS API, WebSocket, Bedrock/DynamoDB/S3
- `packages/shared`: shared types + theme tokens; `packages/tv-focus-kit`: open-source candidate

## Working rules
- When the plan or scope changes, update the PRD/roadmap (and the roadmap change log) in the same change.
- When a tool/SDK causes friction, add an entry to `docs/submission/friction-log.md` (it earns up to +10% judging bonus).
- TV UI: 1920×1080, 5% safe area, visible focus on every focusable element, no text input on TV.
- Never commit secrets; use `.env` with a committed `.env.example`.

## Amazon Devices Builder Tools context
@.claude/amazon-devices/CLAUDE.md

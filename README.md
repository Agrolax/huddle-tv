# Huddle Home

The family home screen for Fire TV: widgets, profiles, and an AI that learns your household, with one-press launch into the apps you already use.

Built for the [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) · **Fire TV track** · AWS Builder + Open Source mini challenges.

> Status: planning / design. Start at [`docs/README.md`](docs/README.md).

## Structure

| Path | What |
|---|---|
| `apps/tv` | Fire TV app (React Native, Vega OS + Fire OS) |
| `apps/companion` | Phone companion (React + Vite web app, opened via QR) |
| `apps/server` | API + realtime (Node + TS, WebSocket, Amazon Bedrock, DynamoDB, S3) |
| `packages/shared` | Shared types + theme tokens |
| `packages/tv-focus-kit` | Open-source candidate (D-pad focus / widget components) |
| `docs/` | PRD, roadmap, architecture, design, references, submission |
| `reference/` | Amazon sample apps (gitignored): `./scripts/fetch-references.sh` |

## Dev tooling
- **Amazon Devices Builder Tools** (MCP + Agent Skills) is configured for Claude Code. Context: `.claude/amazon-devices/CLAUDE.md`; platform: `.adbt-config.json`. Check with:
  `npx -y @amazon-devices/amazon-devices-buildertools-mcp@latest check-status --agent claude-code-cli`
- Update it with:
  `npx -y @amazon-devices/amazon-devices-buildertools-mcp@latest init-context --agent claude-code-cli -p .claude/amazon-devices -m --force`

## Setup

_Coming soon._

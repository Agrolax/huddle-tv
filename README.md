# Huddle

AI-hosted party games for Fire TV. The TV is the stage, everyone's phone is the controller.

Built for the [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) · Fire TV track · AWS Builder + Open Source mini challenges.

> Status: planning / design. See [`docs/PRD.md`](docs/PRD.md) and [`docs/wireframes.html`](docs/wireframes.html).

## Structure

| Path | What |
|---|---|
| `apps/tv` | Fire TV app (React Native, Vega OS or Fire OS) |
| `apps/controller` | Phone controller (React + Vite web app, opened via QR) |
| `apps/server` | Game server (Node + TS, WebSocket, Amazon Bedrock, Amazon Polly) |
| `packages/shared` | Shared event/state types |
| `packages/tv-focus-kit` | Open-source D-pad focus components (Open Source mini challenge) |
| `docs/` | PRD, wireframes, friction log, product feedback |

## Setup

_Coming soon._

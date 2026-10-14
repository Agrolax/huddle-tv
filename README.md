# Huddle Home

The family home screen for Fire TV (Vega OS): household widgets, a phone companion you join with a QR code, Amazon Bedrock picks for tonight, and Sketch it, a draw-and-guess game where phones are the pens.

Built for the [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) · **Fire TV track** · AWS Builder + Open Source mini challenges.

> Status: **step 1 (shell) runs on the Vega Virtual Device** ([screenshots](docs/screenshots/step-1/)). Plan: [roadmap](docs/product/roadmap.md). Docs: [`docs/README.md`](docs/README.md).

## Hackathon at a glance

**Build, Ship, Shape: Amazon Developer Hackathon** · [site](https://amazonappdev2026.devpost.com/) · [rules](https://amazonappdev2026.devpost.com/rules) · [resources](https://amazonappdev2026.devpost.com/resources)

| Date | What |
|---|---|
| **Oct 23, 2026 · 12:00pm PT / 3:00pm EDT** | Submission deadline (we aim for Oct 22) |
| Oct 6, 1:30pm EDT · Oct 19, 12:00pm EDT | Live office hours with the Amazon team ([#1](https://amazon.zoom.us/webinar/register/WN_ny5v5N4GQNGeMMaJRLKerQ) · [#2](https://amazon.zoom.us/webinar/register/WN_kh9CSYi0QtuN31d8nsTuOQ)) |
| Oct 21, 12:00pm PT | AWS credits form closes (✅ requested; $150 code pending) |
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
| **AWS Builder** | Use AWS services with documented integration (Bedrock, AgentCore, Strands, Kiro, SageMaker…). Kiro alone qualifies. | $5,000 + $5k credits + meeting | Bedrock (Nova) for Tonight picks, phone AI chat and Sketch it prompts; DynamoDB, S3, Lightsail. Polly / Transcribe are stretch |
| **Open Source** | New open-source project or a PR/fork/branch to a public repo, made during the hackathon | $5,000 + $5k credits + meeting | `packages/tv-focus-kit`: D-pad focus primitives for React Native TV (MIT) |

### Judging (equally weighted, after a pass/fail viability check)
1. **Tech implementation**: how well it's built and how well it uses the platform
2. **Design**: complete, coherent experience; interaction model fits the device
3. **Potential impact**: credible customer need, audience beyond the hackathon
4. **Quality of idea**: creative, not "obvious". For Fire TV, *obvious* = basic streaming UI / video player / remote game; *creative* = AI viewing that adapts to household patterns, multi-modal voice + D-pad + visual

**Bonus:** friction log entries can add **up to 10%** to the final score → [`docs/submission/friction-log.md`](docs/submission/friction-log.md)

### What we submit
Text description · GitHub repo · demo video < 3 min (running on the device) · product feedback for every tool · track + mini challenges · optional friction log + feature requests. Full list: [`docs/submission/checklist.md`](docs/submission/checklist.md)

## Structure

| Path | What |
|---|---|
| `apps/tv` | Fire TV app (React Native for Vega OS; demo on the Vega Virtual Device) |
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

**Target platform:** Vega OS. Demo on the Vega Virtual Device (included with the SDK). A Vega Fire TV Stick needs OS 1.2 for SDK 0.24. The Fire TV Stick HD (1st gen) in the house is Fire OS 8 and cannot run this app.

The SDK installer is interactive and wants about **20 GB** free. Prerequisites (Homebrew packages, Vega Studio) are already on this Mac. Run the installer yourself:

```bash
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega --version
```

Docs: [Install the Vega Developer Tools](https://developer.amazon.com/docs/vega/0.24/install-vega-sdk.html). Add `@amazon-devices/*` packages with `vega project install <package>` so versions match the SDK, then `npm install`.

### Vega Fire TV (only if the stick is on Vega OS)
1. Settings → My Fire TV → About → press Select on the device name 7 times → developer mode
2. `vega devmode login` to link the device (SDK 0.24)
3. Install and run from Vega Studio, or `vega device` commands in [Run your app](https://developer.amazon.com/docs/vega/0.24/run-apps.html)

### Apps

npm workspaces monorepo. Node ≥ 20.

```bash
npm install            # all workspaces
npm run check          # typecheck every workspace + unit tests
```

**TV app on the Vega Virtual Device**

```bash
source ~/vega/env
vega virtual-device start
npm run build:tv       # apps/tv debug .vpkg (aarch64, armv7, x86_64)
npm run tv:install
npm run tv:launch
```

D-pad: the remote on the VVD window, or `vega exec vda shell "inputd-cli button_press KEY_RIGHT"`. Screenshots: `scripts/vvd-capture.sh out.png KEY_DOWN KEY_ENTER` (presses keys, then captures the VVD screen).

**Server and phone companion** (skeletons in step 1)

```bash
npm run dev:server     # ws://localhost:8787/ws
npm run dev:companion  # http://localhost:5173
```

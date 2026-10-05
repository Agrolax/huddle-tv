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

**Target device:** Fire TV Stick HD (1st gen), Fire OS 8 (Android 11 based).

### Mac tooling (one-time)
```bash
brew install --cask android-studio zulu@17 android-platform-tools
```
Open Android Studio once and install the Android SDK (default), then add to `~/.zshrc`:
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

### Fire TV Stick
1. Settings → My Fire TV → About → press Select on the device name 7 times → "You are now a developer"
2. Settings → My Fire TV → Developer Options → **ADB debugging: ON**, **Apps from unknown sources: ON**
3. Find the IP: Settings → My Fire TV → About → Network
4. `adb connect <ip>:5555` → accept "Allow USB debugging" on the TV → `adb devices`

### Apps
_Coming soon._

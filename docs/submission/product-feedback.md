# Product feedback (required in submission)

One section per tool, API or SDK used. Each point names the tool. Detail and repro steps for every `FL-nn` are in [friction-log.md](friction-log.md).

Draft status (Oct 18): written from the friction log, the roadmap and the code. Lines marked **[confirm]** are things only the builder can vouch for from memory. Edit them, or delete them, before pasting into Devpost. Nothing here claims an AWS service the code does not call.

---

## React Native for Vega (SDK 0.24.12112, `@amazon-devices/react-native-kepler` 2.1.0+rn0.72.0)
- **Used for:** the whole TV app (`apps/tv`): a 4×2 widget home grid, sheets, a live drawing board, D-pad focus on every element, running on the Vega Virtual Device.
- **What worked well:**
  - `TVFocusGuideView` plus `nextFocusUp/Down/Left/Right` on `Pressable` is enough to build a deterministic grid with row memory. Focus behaved the same on the VVD as in our unit logic once the neighbours were set explicitly.
  - `manifest.toml` stayed small: four `needs.module` entries and one interactive component. Build errors about it were clear.
  - Most of the React Native we already knew (Animated, Pressable, StyleSheet, AsyncStorage) just worked, so the TV app shares types and protocol code with a React web companion.
  - `vega project doctor` and `vega project install --fix` caught version drift (FL-07).
- **What needs work:**
  - The app template's Jest setup does not match the SDK: it pins Jest 28 while `react-native-kepler/jest/setup.js` needs 29 (FL-02), it loads upstream RN so `onFocus` is never called in tests (FL-03), and the BackHandler and StatusBar mocks crash (FL-04). Focus is the main interaction on TV and the template cannot test it out of the box.
  - Translucent full-screen overlays paint over their own children on the VVD (FL-11), with no log and green tests.
  - Paths added to a `react-native-svg` view after the first render do not show (FL-14). Silent, and it looked like dropped network frames until we found it.
  - No documented npm-workspaces setup (FL-05). Metro needed `watchFolders`, symlink support and extra `nodeModulesPaths`.
  - The build output path contains a literal `undefined` (FL-06).
- **Onboarding (zero → hello world):** about two days in total, mostly the SDK installer (it wants about 20 GB free and the Mac was short on disk) and finding the right libraries. Once the VVD booted, template to a running custom screen took under an hour. **[confirm the times]**
- **Would build with it again?** Yes. Real React Native, a real focus model and a virtual device we could script made a multi-screen TV app possible in two weeks. The gaps above are about testing and diagnosis, not capability.

## Vega CLI 1.4.4 and the Vega Virtual Device
- **Used for:** `vega virtual-device start`, `vega project doctor` / `install`, `react-native build-vega`, `vega device list`, `vega exec vda shell` with `inputd-cli` to drive the remote, `npm run tv:install` / `tv:launch` wrappers.
- **What worked well:** the VVD boots reliably and installs a `.vpkg` in seconds. `inputd-cli button_press KEY_RIGHT` made the app scriptable, so our screenshot and end-to-end checks run without a person at the remote. `vda shell curl` was a fast way to test networking from the device (FL-12).
- **What needs work:**
  - No screenshot or screen recording command for the VVD. The Builder Tools docs point to a tool that "only works on physical devices" (FL-01). We wrote `scripts/vvd-capture.sh` with CoreGraphics and `screencapture`; it breaks when the window is on another Space.
  - The VVD clock is UTC regardless of the host zone (FL-13), so calendar and clock screenshots look wrong.
  - `vega project install` skips libraries the docs list as supported for SDK 0.24 (QR code, async-storage, mmkv) with "not in OS version 1.2 profile" (FL-09). The CLI and the docs disagree and the message does not say which is right.
  - Reaching a dev server from the VVD (`10.0.2.2`, LAN IP, not `localhost`) is only mentioned on the Charles Proxy page (FL-12).
- **Onboarding:** the installer is a single curl command, but it is interactive and silent about its disk needs until it fails. **[confirm]**
- **Would build with it again?** Yes, with a wrapper script for screenshots.

## Amazon Devices Builder Tools MCP (and Agent Skills)
- **Used for:** project context and Vega documentation lookup from Claude Code (`.claude/amazon-devices/CLAUDE.md`, `.adbt-config.json` set to `vega_os`), including how to screenshot a Vega app (FL-01), how to scaffold and run, and whether an Echo Show can run a Vega app (FL-08). The `amazon-devices-vega-*` skills are installed for focus, navigation and the scalable UI audit. **[confirm which skills and which `read_document` / `search_documentation` calls you actually used while building; list two or three concrete ones]**
- **What worked well:** the platform gate (`.adbt-config.json` → `vega_os`) kept answers on Vega and not Fire OS. **[confirm]** Doc answers named the source document, so we could check them against the developer site; the CLI reference is precise about flags.
- **What needs work:**
  - **`read_document` examples in `react_native_for_vega_get_started.md` do not match the tool.** The guide shows `read_document(document_name: …, target_platform: {...})` and says every call must include `target_platform`, but the tool takes only `document_uri`, and the context file in the project says `read_document` does not take `target_platform`. An agent following the guide literally sends parameters the tool does not accept. (Seen Oct 18, Builder Tools MCP with `react_native_for_vega_get_started.md` "Document Version 11.3.0".)
  - The session-setup protocol in the project context file has an agent run six steps before the first answer, but the MCP tools can still be "connecting" at that point. On our first message the tools were not yet loaded, so step 2 (`set_project_context`) and step 6 (`read_document`) could not run until the server finished starting. A note on what to do when the server is not ready would help.
  - The Vega get-started guide is long, and the project context makes an agent load it in full at the start of every session, even for tasks like writing submission docs. A short index with on-demand sections would save context.
  - No Echo Show or multi-screen guidance: searching "Echo Show" returns i18n and catalog snippets (FL-08).
  - No answer for the VVD screenshot question beyond a physical-device tool (FL-01).
- **Would build with it again?** Yes. It is the reason the Vega-specific questions got Vega-specific answers.

## Vega ports of third-party libraries
Covers `@amazon-devices/react-native-qrcode-svg` 3.0.0, `@amazon-devices/react-native-svg` 3.0.9, `@amazon-devices/react-native-async-storage__async-storage` 2.1.
- **Used for:** the pairing QR on the TV, the live drawing board (one path per pen colour), and keeping the TV token across restarts.
- **What worked well:** all three build and run on the VVD. The QR decodes from a VVD screenshot and the TV token survives a restart.
- **What needs work:** `react-native-qrcode-svg` needs a manual `TextEncoder` polyfill (FL-10). `react-native-svg` drops children added after the first render (FL-14). The CLI refuses to install any of the three (FL-09).
- **Would build with it again?** Yes.

## Amazon Bedrock (Converse and ConverseStream; Nova Micro, Lite and Pro) and the AWS CLI
- **Used for:** the only AWS service this app calls, from our own Node server (`apps/server/src/ai/bedrock.ts`). Nova Lite writes Tonight picks (JSON, with a kid's bedtime in the prompt), Nova Micro streams the phone chat answers (ConverseStream), Nova Pro writes the *Watched It* quiz questions, and a second Nova Pro pass answers each question cold and drops any it disagrees with. Every call sits behind a `HouseholdAI` interface with a deterministic mock as the default and the per-request fallback.
  Measured on Oct 18 from a Mac in us-east-1: Tonight about 1.1 s, chat about 0.5 s to answer, quiz about 2.7 s.
  DynamoDB, S3, Polly and Transcribe are **not** used in the submitted build (household state is in server memory).
- **What worked well:** Converse gave one request shape across Nova models, so switching Micro/Lite/Pro was a model ID change. ConverseStream made the chat feel instant. `aws login` from a console session worked on a Mac with no stored keys. Nova answered with usable JSON when prompted for JSON only.
- **What needs work:**
  - A first call on a 13-day-old, active, paid account returned "Your account is currently being verified" (FL-15); the same call worked a minute later. No banner or status in the console. On a demo day that looks like a broken integration.
  - Claude models appear as inference profiles but return "not available for this account", with no hint of what unlocks them.
  - Quality: Nova Lite, Nova Pro and Nova 2 Lite all made up movie facts in quiz questions. We moved to Nova Pro, asked for 8 questions and kept only those a second, cold pass answered the same way. On *Paddington 2* that left 4 of 5 right, with one still wrong, so the demo uses a hand-checked set. Nova also suggested titles that run past the stated bedtime, so the server drops them by runtime after the model answers.
  - Ratings: with kids present the prompt needed an explicit "G or PG only" line before the picks were suitable for them.
- **Would build with it again?** Yes for latency and cost; plan on a verification step for any factual output. **[confirm cost: credits page showed $0 used on Oct 18; add the final number before submitting]**

## Open-Meteo (not an Amazon tool)
- **Used for:** live weather on the TV. No key, simple JSON, polled every 15 minutes from the server. Worked without friction.

## Kiro and the AWS Knowledge MCP
- **[confirm]** Installed on Oct 7. If you did not use Kiro or the AWS Knowledge MCP while building, delete this section. Do not claim them.

---

## Feature requests
| Request | Why it matters | Priority |
|---|---|---|
| `vega device screenshot --out file.png` and `screenrecord` that work on the Vega Virtual Device (FL-01) | Screenshots and recordings are how developers write bug reports, docs and demo videos, and the VVD is the only device most developers (and every judge) has | Critical |
| Make the app template test-ready: Jest 29, the Kepler preset and `react-native` mapping, a focus test, working BackHandler and StatusBar mocks (FL-02, FL-03, FL-04) | Focus is the main interaction on TV; today it cannot be unit tested from the template | Important |
| Make `vega project install` and the supported-libraries docs come from one source, and say why a package is skipped (FL-09) | Developers cannot tell whether the CLI or the docs is right | Important |
| Fix or document `react-native-svg` child insertion on Vega, and translucent overlay compositing (FL-14, FL-11) | Both fail silently, with passing tests and no log | Important |
| Make the Builder Tools `read_document` examples match the tool's real parameters, and say what an agent should do when the MCP server is still connecting | An agent following the guide literally sends parameters the tool rejects | Important |
| `vega virtual-device start --timezone` (or inherit the host zone) (FL-13) | Calendar and clock UIs look wrong on the VVD | Nice-to-have |
| A "Vega app in a monorepo" doc page and a `--monorepo` option on `vega project generate` (FL-05) | npm workspaces need a lot of Metro and Jest setup that is not written down | Nice-to-have |
| A "Networking from the Virtual Device" page: host aliases, cleartext `ws://`, required privileges (FL-12) | Every companion-app developer needs it | Nice-to-have |
| An "Echo Show and Vega" page in the Builder Tools KB: what runs where, and the multi-screen options for a Fire TV app (FL-08) | Developers will ask whether an Echo can be a second screen | Nice-to-have |
| Say why a Bedrock account is "being verified", where to see its status, and what unlocks a listed model (FL-15) | A new account looks broken for the first call | Nice-to-have |

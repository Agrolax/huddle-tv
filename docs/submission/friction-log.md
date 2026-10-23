# Friction log

Submissions with friction logs can earn up to a **10% judging bonus**. Log snags *as they happen*; reconstructing them later is painful.

Severity: **Blocker** · **Major** · **Minor** · **Papercut**

---

## Template

### FL-00 — <short title>
- **Tool / SDK:**
- **Task attempted:**
- **Steps taken:**
  1.
- **Expected:**
- **Actual:**
- **Severity:**
- **Workaround:**
- **Suggestion:** (concrete and actionable, e.g. "add X to the Y docs page")

---

<!-- entries below -->

### FL-01 — No screenshot tool for the Vega Virtual Device
- **Tool / SDK:** Vega CLI 1.4.4 / SDK 0.24.12112, Vega Virtual Device, Amazon Devices Builder Tools MCP
- **Task attempted:** Capture screenshots of each screen and focus state for the PR and the demo.
- **Steps taken:**
  1. Asked the Builder Tools MCP how to screenshot a Vega app. It points to `vega exec vda ... gwsi-tool-screenshooter`.
  2. The same doc says the tool "only works on physical Vega or Kepler devices", not on the virtual device (`vvrp`).
- **Expected:** `vega device screenshot` (or an equivalent) that works on the VVD, which is the device most developers, and every hackathon judge, actually have.
- **Actual:** No supported way to screenshot the VVD.
- **Severity:** Major (screenshots and recordings are core to docs, bug reports and demo videos)
- **Workaround:** `scripts/vvd-capture.sh`: send keys with `inputd-cli`, find the VVD window with CoreGraphics, `screencapture -l <window>`, crop off the title bar and the remote panel. macOS only.
- **Suggestion:** Add `vega device screenshot --out file.png` (and `screenrecord`) that works on both the VVD and devices.
- **Update (Oct 15, step 4):** The workaround breaks as soon as the VVD window is on another macOS Space or behind another app: the on-screen window list doesn't include it, so the script found nothing. We now look the window up in the full list (`screencapture -l` still grabs it), but an off-screen window captures at 1x, so the 1920×1080 output is upscaled and soft. A real screenshot command would avoid all of this.

### FL-02 — Vega app template pins Jest 28, but the SDK's jest setup needs Jest 29
- **Tool / SDK:** `@amazon-devices/react-native-kepler` 2.1.0+rn0.72.0 `jest/setup.js`; the Vega helloWorld template (`jest ^28`)
- **Task attempted:** Run component tests for the home screen.
- **Steps taken:** `npm test` in the generated app with any component that animates.
- **Expected:** Tests run.
- **Actual:** `TypeError: jest.now is not a function` from `react-native-kepler/jest/setup.js:38` (its `requestAnimationFrame` mock). `jest.now()` doesn't exist in Jest 28. react-native-kepler itself is developed against `jest ^29`.
- **Severity:** Minor
- **Workaround:** Upgrade the app to `jest`/`babel-jest` `^29.7.0`. (Fake timers looked like a fix but hang `@testing-library/react-native`'s cleanup.)
- **Suggestion:** Bump the template to Jest 29, or guard the setup with `typeof jest.now === 'function' ? jest.now() : Date.now()`.

### FL-03 — Template's Jest preset loads upstream React Native, so focus events can't be tested
- **Tool / SDK:** Vega app template `jest.config.json` (`"preset": "react-native"`)
- **Task attempted:** Unit test that a focused tile shows its focus ring (`fireEvent(tile, 'focus')`).
- **Steps taken:** Rendered a `Pressable` with `onFocus`, fired `focus`.
- **Expected:** `onFocus` is called, as it is on the device.
- **Actual:** Never called. The template's preset resolves `react-native` to upstream RN 0.72, whose `Pressable` doesn't pass `onFocus`/`onBlur` to Pressability. The Vega fork does. Tests run against a different `Pressable` than the device.
- **Severity:** Major for TV apps (focus is the main interaction and it can't be tested)
- **Workaround:** `preset: '@amazon-devices/react-native-kepler'` plus `moduleNameMapper` `^react-native$` → react-native-kepler (see `apps/tv/jest.config.js`).
- **Suggestion:** Ship the template with the Kepler preset and that mapping, and add a focus test to the template so it stays working.

### FL-04 — Kepler jest mocks: BackHandler returns no subscription, StatusBar crashes
- **Tool / SDK:** `@amazon-devices/react-native-kepler/jest/setup.js`
- **Task attempted:** Test Back-key handling and render the template's `<StatusBar hidden />`.
- **Actual:** `BackHandler.addEventListener` is mocked as a bare `jest.fn()`, so `sub.remove()` in an effect cleanup throws `Cannot read properties of undefined (reading 'remove')`. `<StatusBar>` throws `Cannot read properties of undefined (reading 'getConstants')` from `NativeStatusBarManagerKepler` under the Kepler preset.
- **Severity:** Minor
- **Workaround:** Mock `addEventListener` to return `{remove}` in the test. Dropped `StatusBar`, since a TV has none.
- **Suggestion:** Have the BackHandler mock return `{remove: jest.fn()}` like upstream's, and mock `NativeStatusBarManagerKepler`. Or remove `StatusBar` from the TV template.

### FL-05 — No documented npm-workspaces (monorepo) setup for a Vega app
- **Tool / SDK:** Vega template `metro.config.js` / `jest.config.json`, `react-native build-vega`
- **Task attempted:** Put the TV app in an npm workspaces monorepo with shared TypeScript packages (`packages/shared`, `packages/tv-focus-kit`).
- **Actual:** The template assumes app-local `node_modules`: the jest `setupFiles` path is hard-coded to `./node_modules/@amazon-devices/...`, and Metro doesn't see hoisted or symlinked packages. Amazon's multi-TV sample is a monorepo, but it uses Yarn 4 and per-package resolution maps, and nothing documents the npm path.
- **Severity:** Minor
- **Workaround:** Metro `watchFolders: [repoRoot]`, `unstable_enableSymlinks`, `nodeModulesPaths` for app and root. Jest `require.resolve` for the setup file and `moduleNameMapper` for workspace packages. `vega build` then works with hoisted deps (KMMB found the packages fine).
- **Suggestion:** A "Vega app in a monorepo" doc page (npm, yarn, pnpm) and a `--monorepo` flag on `vega project generate`.

### FL-06 — Build output path contains a literal `undefined`
- **Tool / SDK:** `react-native build-vega` (SDK 0.24)
- **Actual:** Packages land in `build/private/kepler/tv/undefined/vega/<arch>/Debug/tv_<arch>.vpkg` (plus copies in `build/<arch>-debug/`).
- **Severity:** Papercut
- **Suggestion:** Fill in the missing segment, or drop it.

### FL-07 — Freshly generated template is already out of date with the SDK profile
- **Tool / SDK:** `vega project doctor`, `vega project install`
- **Actual:** A project generated on Oct 9 with SDK 0.24 fails doctor on Oct 14: `@amazon-devices/react-native-kepler: 2.0.0 -> 2.1.0+rn0.72.0`. `vega project install --fix` fixes it and rewrites `package.json` formatting.
- **Severity:** Papercut
- **Suggestion:** Generate the template through the same resolver that `project install` uses, so new projects pass `doctor` right away.

### FL-08 — Echo Show: no Vega app path, and the docs live in a different portal
- **Tool / SDK:** Amazon Devices Builder Tools MCP, Alexa developer docs
- **Task attempted:** Learn whether an Echo Show (Vega OS) can run a second-screen app for our household.
- **Actual:** The MCP has no Echo guidance, and searching "Echo Show" returns i18n and catalog snippets. The answer (Alexa skill + `Alexa.Presentation.HTML`, or APL widgets + Data Store API) is only in the Alexa docs, which don't say whether the HTML runtime allows WebSockets. See [echo-show.md](../research/echo-show.md).
- **Severity:** Minor
- **Suggestion:** Add an "Echo Show and Vega" page to the Builder Tools KB: what runs where, and the multi-screen options for a Fire TV app.

### FL-09 — `vega project install` rejects libraries the docs list as supported for SDK 0.24
- **Tool / SDK:** Vega CLI 1.4.4 (`vega project install`), SDK 0.24.12112, OS 1.2 profile
- **Task attempted:** Add a QR code and persistent storage to the TV app the recommended way (`vega project install <pkg>`).
- **Steps taken:** `vega project install --dry-run @amazon-devices/react-native-qrcode-svg @amazon-devices/react-native-async-storage__async-storage @amazon-devices/react-native-mmkv`
- **Expected:** Resolved versions. The [react-native-qrcode-svg page](https://developer.amazon.com/docs/vega-api/0.24/react-native-qrcode-svg.html) says `~3.0.0` is the version for SDK 0.24 / OS 1.2, and async-storage and mmkv are in the 0.24 supported-libraries list.
- **Actual:** `⚠️ … not in OS version 1.2 profile, skipping` for all three. Only `react-native-svg` resolved.
- **Severity:** Major (the CLI the README tells you to use contradicts the docs, and you can't tell which one is right)
- **Workaround:** Installed by hand with `npm install @amazon-devices/react-native-qrcode-svg@~3.0.0 @amazon-devices/react-native-async-storage__async-storage@~2.1.0`. Both build and work on the VVD (QR renders and decodes; the TV token survives an app restart).
- **Suggestion:** Generate the CLI profile from the same source as the supported-libraries docs, and have `project install` say *why* a package is missing (not ported vs. not yet in the profile).

### FL-10 — react-native-qrcode-svg needs a manual TextEncoder polyfill
- **Tool / SDK:** `@amazon-devices/react-native-qrcode-svg` 3.0.0
- **Actual:** The docs' "Known issues" say the app may crash on `TextEncoder` and to add `fast-text-encoding` yourself and import it wherever you use the QR component.
- **Severity:** Papercut
- **Suggestion:** Ship the polyfill as a dependency of the port, or set `TextEncoder` in the Vega runtime.

### FL-11 — Translucent full-screen overlay painted over its own children
- **Tool / SDK:** React Native for Vega 0.72 (react-native-kepler 2.1.0), Vega Virtual Device
- **Task attempted:** A modal "Connect your phone" sheet: an absolutely positioned full-screen `View` with `backgroundColor: 'rgba(8,11,16,0.94)'`, containing a `TVFocusGuideView` card with its own opaque background.
- **Expected:** Dimmed home behind a bright card (what web, iOS and Android render).
- **Actual:** On the VVD the whole sheet (QR, text, Done button) rendered at ~6% brightness, as if the translucent background were drawn on top of the children. The card's own background never showed. Screenshot in PR #2.
- **Severity:** Major (hard to diagnose: the jest tests pass and nothing is logged)
- **Workaround:** Make the backdrop a *sibling* of the card (`opacity: 0.94` on a solid colour) and put the card background on a plain `View` instead of on `TVFocusGuideView`.
- **Suggestion:** Document (or fix) how alpha backgrounds and `TVFocusGuideView` backgrounds composite on Vega, and add a modal-overlay example to the focus-management docs.

### FL-12 — How the Vega Virtual Device reaches a dev server on the host isn't documented in one place
- **Tool / SDK:** Vega Virtual Device, docs
- **Task attempted:** Connect the TV app to a local WebSocket server on the Mac.
- **Actual:** The only mention we found is the Charles Proxy page ("use 10.0.2.2 as the host value"). Testing showed both `10.0.2.2` and the Mac's LAN IP work, and `localhost` doesn't. No doc covers WebSockets, cleartext `ws://`, or whether an app needs a manifest privilege for network access (none was needed).
- **Severity:** Minor
- **Workaround:** Probed with `vega exec vda shell "curl -s http://<host>:<port>/"`, then used the LAN IP so the phone and the TV share one address (README › Networking).
- **Suggestion:** A "Networking from the Virtual Device" page: host aliases, cleartext policy, required privileges (if any), and `vda reverse` for real devices.

### FL-13 — The Vega Virtual Device clock runs in UTC
- **Tool / SDK:** Vega Virtual Device (SDK 0.24.12112)
- **Task attempted:** Show the family calendar and a clock in local time on the TV.
- **Expected:** The VVD uses the host Mac's time zone (Toronto, EDT), like the Android emulator does by default.
- **Actual:** `new Date()` on the VVD reports UTC. The clock showed 6:24 when the Mac showed 2:24 pm, and a 7 pm event showed as 11:00. Nothing in `vega virtual-device start --help` or the VVD docs sets the time zone.
- **Severity:** Minor (demo screenshots look wrong; real devices use the user's zone)
- **Workaround:** None yet. Times are correct relative to each other; we record the demo with this in mind.
- **Suggestion:** Inherit the host time zone, or add a `--timezone` option to `vega virtual-device start`.

### FL-14 — react-native-svg on Vega: Paths added after the first render don't show
- **Tool / SDK:** `@amazon-devices/react-native-svg` 3.0.9000000001 (react-native-svg 15.11.1), React Native for Vega 0.72, Vega Virtual Device
- **Task attempted:** Sketch the pick: the TV draws a phone's strokes live, one `<Path>` per stroke inside an `<Svg>`, adding a `<Path>` as each stroke arrives.
- **Expected:** Every new `<Path>` child renders, as on iOS, Android and web.
- **Actual:** The first six strokes showed. Strokes added after that never appeared, though the server had all of them, React state had all of them, and the jest tests passed. Nothing was logged. Screenshots in the step 6 PR.
- **Severity:** Major (silent: looks like dropped network frames)
- **Workaround:** Keep a fixed set of always-mounted `<Path>` elements (one per pen color) and grow each one's `d` string instead of adding children. That also means fewer native views for long drawings.
- **Suggestion:** Fix child insertion in the Vega SVG view manager, or document the limit, and add a "draw live" sample to the react-native-svg port docs.

### FL-15 — Bedrock "account is currently being verified" on an account that was already active
- **Tool / SDK:** Amazon Bedrock Runtime (Converse), AWS CLI 2.37 `aws login`, account created Oct 5
- **Task attempted:** First Bedrock call from the Mac on Oct 18: `aws bedrock-runtime converse --model-id us.amazon.nova-micro-v1:0`.
- **Expected:** An answer, or a clear model-access or quota error.
- **Actual:** `AccessDeniedException: Your account is currently being verified. Verification normally takes less than 2 hours.` The account was 13 days old, on the paid plan, `ACTIVE`, with $250 in credits. The console showed no banner or pending step. A Nova Lite call a minute later worked, and Micro then worked too. Separately, Claude models are listed as inference profiles but return "not available for this account", with no hint of what unlocks them.
- **Severity:** Minor (cost 20 minutes; on demo day it would look like a broken integration)
- **Workaround:** Retry after a minute. The server already falls back to the mock on any Bedrock error, so the TV never shows it.
- **Suggestion:** Say *why* an account is being verified and where to see its status, and say what a new account needs to use a listed model.

### FL-16 — Recording the Vega Virtual Device: no recorder, and the window capture changes size between runs
- **Tool / SDK:** Vega Virtual Device (VVD), Vega CLI 1.4.5, macOS `screencapture`
- **Task attempted:** Record the TV screen for the demo video, scripted, so it can be re-recorded after a redesign.
- **Expected:** `vega device` has a screen-record command (FL-01 is the same gap for screenshots).
- **Actual:** There is none, so we record the VVD window with `screencapture -v -l <window id>`. Three things bite: `screencapture` only writes the file when its own `-V` timer ends (a SIGINT discards the take), the shadow margin around the window differs between recordings (the TV screen sat 67 px further right and 46 px lower in a later take of the same window), and the title bar and remote panel come along. We find the window corner in the first frame and crop 1920×1080 from it.
- **Severity:** Minor (cost about 40 minutes)
- **Workaround:** `scripts/demo/record.mjs` and `scripts/demo/assemble.mjs`.
- **Suggestion:** A `vega virtual-device record --out file.mp4` (and `screenshot`) that captures only the TV framebuffer at 1920×1080.


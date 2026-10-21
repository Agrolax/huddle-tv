# apps/tv — Huddle Home (Vega OS)

React Native for Vega, SDK 0.24, RN 0.72 (`@amazon-devices/react-native-kepler` 2.1.0). Part of the npm workspaces monorepo: run installs from the repo root.

## Screens
Full state list: [docs/design/screen-inventory.md](../../docs/design/screen-inventory.md).

1. **Who's here?** Multi-select profiles. Select toggles; Continue goes Home.
2. **Home.** Greeting, "Connect phone", and a 4×2 widget grid built with `@huddle/tv-focus-kit`'s `FocusGrid`:

   ```
   clock & weather | family calendar (2 wide) | who's here
   tonight (2 wide)       | game night        | home (smart, simulated)
   ```
   Back on Home → Who's here. Back on Who's here exits. Select on Tonight, Game night or Home opens a sheet. Clock and calendar do not.
3. **Sheets:** Connect phone (QR), Tonight (picks and the secret vote), Game night (quiz and Sketch the pick), Home devices. Focus stays in the sheet. Back or Done closes it and returns focus to the control that opened it.
4. **Overlays that do not take focus:** a message toast (8 s, bottom right) and a door alert (15 s, bottom left).

Live household: `src/net/HouseholdContext.tsx` wraps the shared `HuddleSocket` (reconnects with backoff). A phone's `profile:changed` updates Who's here. `message:new` shows the toast only. When the socket is not open, Home shows an Offline pill.

## Server address
`scripts/write-config.mjs` runs before build, start, test and typecheck. It writes `src/config.generated.ts` (gitignored) with `SERVER_URL = ws://<this Mac's LAN IP>:8787/ws`. Override with `HUDDLE_SERVER_URL=ws://… npm run build:tv`, and the household with `HUDDLE_HOUSEHOLD`. The VVD reaches the Mac on its LAN IP (and on `10.0.2.2`). See the README › Networking.

## Commands
```bash
# from the repo root
npm install
npm run typecheck -w @huddle/tv
npm test -w @huddle/tv

source ~/vega/env
vega virtual-device start
npm run build:tv          # build/aarch64-debug/tv_aarch64.vpkg (VVD), armv7, x86_64
npm run tv:install        # vega device install-app --dir . -b Debug
npm run tv:launch         # vega device launch-app --dir .

# drive the remote and capture the screen (macOS)
scripts/vvd-capture.sh /tmp/home.png KEY_DOWN KEY_RIGHT
```

## Monorepo notes
- `metro.config.js` watches the repo root and follows the `node_modules/@huddle/*` symlinks.
- `jest.config.js` uses the Kepler jest preset and maps `react-native` → `@amazon-devices/react-native-kepler`. Upstream RN's `Pressable` drops `onFocus`, so focus can't be tested without it (friction log FL-03).
- Add `@amazon-devices/*` packages with `vega project install <pkg>` in this folder, then `npm install` at the root. Some libraries the docs list for SDK 0.24 aren't in the CLI's OS 1.2 profile (qrcode-svg, async-storage); those are pinned by hand (friction log FL-09).
- Jest maps the QR component and AsyncStorage to small mocks (`test/mocks/`), and `test/fakeServer.ts` stands in for the server.

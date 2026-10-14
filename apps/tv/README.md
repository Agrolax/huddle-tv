# apps/tv — Huddle Home (Vega OS)

React Native for Vega, SDK 0.24, RN 0.72 (`@amazon-devices/react-native-kepler` 2.1.0). Part of the npm workspaces monorepo: run installs from the repo root.

## Screens (step 1)
1. **Who's here?** Multi-select profiles. Select toggles; Continue goes Home.
2. **Home.** Greeting, "Connect phone", and a 4×2 widget grid built with `@huddle/tv-focus-kit`'s `FocusGrid`:

   ```
   clock & weather | family calendar (2 wide) | who's here
   tonight (2 wide)       | sketch it         | home (smart, simulated)
   ```
   Back on Home → Who's here. Back on Who's here exits.
3. **Connect phone** (step 2): from the chip above the grid. Shows a big QR, the code and the join URL. Focus is trapped in the sheet. Back or Done closes it, and focus returns to the chip.

Live household (step 2): `src/net/HouseholdContext.tsx` wraps the shared `HuddleSocket` (reconnects with backoff). A phone's `profile:changed` updates Who's here and the greeting. `message:new` shows a toast for 8 s and stays in the greeting subline. The status pill shows Online / Reconnecting / Offline.

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

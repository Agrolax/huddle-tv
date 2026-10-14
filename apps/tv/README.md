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
- Add `@amazon-devices/*` packages with `vega project install <pkg>` in this folder, then `npm install` at the root.

# apps/tv — Huddle Home (Vega OS)

React Native for Vega, SDK 0.24, RN 0.72.

## Phase 1 screens
1. Who's here?
2. Home (apps row + weather + board)
3. Launching overlay (`Linking.openURL`)

## Commands
```bash
source ~/vega/env
cd apps/tv
npm install
npm run build:debug

# Virtual Device (x86_64 package on Mac sim)
vega virtual-device start
vega run-app build/private/kepler/tv/undefined/vega/x86_64/Debug/tv_x86_64.vpkg
```

Theme tokens: `src/theme.ts` and `packages/shared`.

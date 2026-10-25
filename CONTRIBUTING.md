# Contributing to Huddle Home

Thanks for taking a look. Huddle Home is a first MVP that is still in progress, so issues, ideas and small pull requests are all welcome. If you're planning something bigger, open an issue first so we can agree on the shape before you spend the time.

## Ways to help

- **Report a bug.** Open an issue with what you did, what you expected, and what happened. Say which part it was (TV app, phone companion, server) and include a screenshot if it's visual.
- **Suggest a feature.** Open an issue and describe the family moment it's for. The product thinking is in [docs/product/PRD.md](docs/product/PRD.md).
- **Pick up an issue.** Issues labelled `good first issue` are small and self-contained. Comment on one before you start so two people don't do the same work.
- **Improve the focus kit.** [`react-native-tv-focus-kit`](packages/tv-focus-kit) is published to npm on its own. See [below](#tv-focus-kit).

## Set up

Node 20 or later.

```bash
npm install
npm run check      # typecheck + tests for every workspace
```

The server and the phone companion run on any machine:

```bash
npm run dev:server
npm run dev:companion
```

The TV app needs the Vega SDK and the Vega Virtual Device. Setup is in the [README](README.md#setup). You don't need it for server, companion, shared or focus kit changes; `npm run check` covers the TV app's tests without a device.

No keys are needed to develop. The AI runs on a mock unless you turn on Bedrock, and posters are optional. See [Keys and settings](README.md#keys-and-settings).

## Where things are

| Folder | What |
|---|---|
| `apps/tv` | Fire TV app (React Native for Vega) |
| `apps/companion` | Phone web app (React + Vite) |
| `apps/server` | WebSocket server, Bedrock calls, TMDB posters |
| `packages/shared` | Realtime protocol (`protocol.ts`) and theme tokens |
| `packages/tv-focus-kit` | D-pad focus primitives, published as `react-native-tv-focus-kit` |
| `docs/` | Product, architecture, design, research |

A message between the TV, the phones and the server goes through `packages/shared/src/protocol.ts`. Add the type and its validator there first, then handle it in the server's `hub.ts`.

## Making a change

1. Fork the repo and branch from `main`.
2. Keep each pull request to one change. Small PRs get reviewed faster.
3. Add or update tests next to the code you touched (`test/` in each workspace).
4. Run `npm run check` and make sure it passes.
5. For anything you can see, attach a before and after screenshot. On the Vega Virtual Device, `scripts/vvd-capture.sh out.png` captures the TV screen.
6. Write the PR description as what changed and why, in plain words.

### TV screen rules

- Design for 1920×1080 and keep content inside a 5% safe area.
- Every focusable element needs a visible focus state, and every screen must be usable with the D-pad alone.
- No text input on the TV. Anything typed happens on a phone.

### Secrets

Never commit keys or tokens. Put them in `apps/server/.env`, which git ignores, and add a commented placeholder to `apps/server/.env.example` if you introduce a new setting. Document new settings in the README's Keys and settings section.

## tv-focus-kit

`packages/tv-focus-kit` is a standalone library with no dependencies beyond `react` and `react-native`. Keep it that way: nothing Huddle-specific and nothing Vega-only.

```bash
npm test -w react-native-tv-focus-kit
npm run typecheck -w react-native-tv-focus-kit
npm run build -w react-native-tv-focus-kit
```

The navigation rules live in `src/grid.ts` as plain TypeScript and are covered by `test/grid.test.ts`. A change to how focus moves should come with a test that shows the grid and the expected move.

Releases: bump `version` in `packages/tv-focus-kit/package.json` following semver, then run `npm publish` from that folder (the build runs automatically before packing).

## Code style

TypeScript throughout, strict mode. Match the code around you: its naming, its comment density, and its idioms. Prefer small, readable functions over clever ones.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

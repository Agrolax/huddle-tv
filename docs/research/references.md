# References

Sample apps are cloned locally into `reference/` by `scripts/fetch-references.sh`.

Add links here as you find them. Keep one line of "why it's useful" per link.

## Hackathon
- [Hackathon home](https://amazonappdev2026.devpost.com/): tracks, prizes, judging criteria
- [Official rules](https://amazonappdev2026.devpost.com/rules): submission requirements, "obvious vs creative" examples per track
- [Resources](https://amazonappdev2026.devpost.com/resources): official SDK/sample list (summarized below)
- [AWS credit request form](https://forms.gle/GaHFxSbBQNG9Kti6A): $150, due Oct 21 12pm PT, first-come first-served, ~5 business days. Must name your track in the description. (The rules page links `forms.gle/5hyhr1u6x3fuV2aW7`; it's the same form.)
- Live office hours: schedule + join link posted on the hackathon landing page. Our notes: [office-hours.md](office-hours.md)

## Competition snapshot (Amazon slide, public repos as of Oct 1, directional only)
44K+ registered. Share of public hackathon repos by track: **Alexa+ 70% · Fire TV 16% · Ring 11% · Bee 3%**.
- Fire TV has the same cash as Alexa+ ($44K across 3 places) with roughly 1/4 of the competition, which confirms our track choice.
- Ring and Bee: $20K cash each (2 places). Amazon says it wants more entries there.

## Similar products (how Huddle differs)
- **Projectivy Launcher**, **Wolf Launcher**: popular custom launchers for Android TV / Fire TV. Fire TV users install them to get rid of ads and bring back a simple app grid. Setting them as the default on Fire TV needs workarounds. *This shows real demand for a better home.*
- Huddle's difference: a normal app (no hacks), built for the **household** (profiles, family board, agenda, photos), with AI (Tonight picker, patterns, daily brief) and a phone companion. Launchers are single-user app grids.
- Family dashboards (Skylight, DAKboard, Echo Show home): household info on a dedicated screen, not on the TV.

## AI tooling (installed in this project)
- [Amazon Devices Builder Tools](https://developer.amazon.com/docs/vega/0.24/mcp-server): MCP server + Agent Skills for Fire OS / Vega: scaffolding, crash analysis, perf profiling, docs search. **Installed:** MCP server (user scope) + Amazon skills in `~/.claude/skills`, context in `.claude/amazon-devices/`.

## Fire TV starter samples (all React Native unless noted)
| Sample | Why |
|---|---|
| [react-native-multi-tv-app-sample](https://github.com/AmazonAppDev/react-native-multi-tv-app-sample) | **Most complete.** One codebase for Vega / Android TV / Apple TV / web. Drawer nav, content grid, hero, video player. Best base for a home-screen-style app. |
| [react-native-multi-tv-helloworld](https://github.com/AmazonAppDev/react-native-multi-tv-helloworld) | Minimal multi-platform starter |
| [hello-world-fire-tv-react-native](https://github.com/AmazonAppDev/hello-world-fire-tv-react-native) | 5-minute hello world, good for day-1 device check |
| [vega-video-sample](https://github.com/AmazonAppDev/vega-video-sample) | Richest Vega reference: media player, focus mgmt, live TV, IAP, **content launcher** |
| [vega-tv-interfaces-sample](https://github.com/AmazonAppDev/vega-tv-interfaces-sample) | Recommended TV UI patterns: focus, i18n, navigation, scrolling. **Study for design.** |
| [vega-sports-app](https://github.com/AmazonAppDev/vega-sports-app) | Themeable content app with catalog integration |
| [vega-audio-sample](https://github.com/AmazonAppDev/vega-audio-sample) | Music player: album, track, search, library, settings |
| [hello-world-fire-tv](https://github.com/AmazonAppDev/hello-world-fire-tv) | Native path: Kotlin + Jetpack Compose |
| [All AmazonAppDev repos](https://github.com/amazonappdev) | |

- [The Ultimate Guide to React Native TV Development](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-tv-development) (Callstack, free e-book)

## Vega packages to install

SDK first: [Install the Vega Developer Tools](https://developer.amazon.com/docs/vega/0.24/install-vega-sdk.html) (CLI, SDK 0.24, Vega Virtual Device). Add Amazon packages with `vega project install <name>` so the version matches OS 1.2, then `npm install`. Full catalog: [Supported libraries and services](https://developer.amazon.com/docs/vega-api/0.24/supported-libraries.html).

**For Huddle**

| Package | Why |
|---|---|
| `@amazon-devices/react-native-kepler` | React Native for Vega. Comes with the app template. React and React Native themselves are provided by the OS |
| `@amazon-devices/react-navigation` (RN 0.72: `^7`; RN 0.83: `^8`) | TV navigation. Use this, not the public `@react-navigation` packages |
| `@amazon-devices/kepler-ui-components` | TV UI (carousel and friends). On RN 0.83 this must be 3.x |
| `@amazon-devices/react-native-svg`, `@amazon-devices/react-native-fast-image`, `@amazon-devices/lottie-react-native` | Icons, posters, motion |
| `@amazon-devices/react-native-async-storage__async-storage` | Cache the last household snapshot on device |
| `@amazon-devices/react-native-netinfo` | Know when the TV is offline and should render from cache |
| `@amazon-devices/react-native-qrcode-svg` | Pairing QR on the TV |
| React Native `Linking` (built in) | Launch Netflix and the rest. Not a separate download |

**Available, not needed for the MVP:** Content Launcher, Account Login, and Media Controls (`@amazon-devices/kepler-media-content-launcher`, `kepler-media-account-login`, `kepler-media-controls`) are for apps that *receive* "play this title" from Fire TV. In-app purchasing (`kepler` IAP + App Tester) is out of scope. Media players (Shaka, hls.js, dash.js) matter only if Huddle plays video itself.

**Plain JavaScript that works without a Vega port:** lodash, zod, socket.io-client. Anything with native code needs an `@amazon-devices` port. On RN 0.83, `@amazon-devices/shopify__flash-list` is broken; use `@shopify/flash-list@2.1.0` if we need a long list. Expo font, GL, image manipulator, notifications, splash, sqlite, and system-ui are not stabilized on RN 0.83.

## Fire TV / Vega docs
- [Amazon Developer documentation](https://developer.amazon.com/docs/apps-and-games/documentation.html)
- [Announcing Vega OS / getting started](https://developer.amazon.com/apps-and-games/blogs/2025/09/announcing-vega-os)
- [Deep linking in Vega apps](https://developer.amazon.com/docs/vega/0.22/deep-links-vega-apps.html): includes launching a URL in *another* app via the Linking API
- [Featured content deep links (Vega + Fire OS)](https://developer.amazon.com/docs/vega/0.21/featured-content-deeplinks.html)
- [Reuse React Native Vega code across TV OSes](https://community.amazondeveloper.com/t/reuse-your-react-native-vega-code-across-tv-operating-systems/27616): Amazon's monorepo pattern
- [Video: Build a podcast app for Fire TV with Vega OS & React Native](https://www.youtube.com/watch?v=IzrhMN94gEE)
- [Fire TV Developer Tools menu](https://developer.amazon.com/docs/fire-tv/developer-tools.html)

## Community & learning
- [Vega developer forum](https://community.amazondeveloper.com/c/vega/6)
- [Fire Devices & Appstore forum](https://community.amazondeveloper.com/c/fire-apps/17): mostly support complaints; our read of it is in [community-research.md](community-research.md)
- [AmazonAppDev YouTube](https://www.youtube.com/channel/UCT9ApARFgQJOeqD-ygmxnJQ)
- [AmazonAppDev on dev.to](https://dev.to/amazonappdev)

## AWS (AWS Builder mini challenge)
- [AWS Builder Center](https://builder.aws.com/)
- [Learn on Builder Center](https://builder.aws.com/learn): Bedrock, AgentCore, Kiro tutorials

## Open Source mini challenge
- Must be a contribution *alongside* the main project (new OSS repo, or PR/fork/branch of a public repo) made during the hackathon window.
- [Hacktoberfest](https://hacktoberfest.com/questions/): runs in October; same contribution may also count there (check their 2026 rules)

## Other tracks (for cross-device ideas)
- Ring: [get started](https://developer.amazon.com/docs/ring/get-started.html) · [API reference](https://developer.amazon.com/docs/ring/api-documentation.html) · [UX design guide](https://developer.amazon.com/docs/ring/ux-design-guide.html) · [ring-api-helloworld](https://github.com/AmazonAppDev/ring-api-helloworld) · [Ring appstore](https://ring.com/appstore)
- Bee: [docs](https://docs.bee.computer/) · [bee-cli](https://github.com/bee-computer/bee-cli) · [bee-skill](https://github.com/bee-computer/bee-skill)
- Alexa+ / MCP: [Agent Skills](https://apps.extensions.modelcontextprotocol.io/api/#build-with-agent-skills) · [Streamable HTTP spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#streamable-http) · [MCP docs](https://modelcontextprotocol.io/docs/latest/getting-started/intro)

## Design inspiration
<!-- screenshots / links: Google TV home, Apple TV, Android TV launchers, Plex, etc. -->

# References

Sample apps are cloned locally into `reference/` by `scripts/fetch-references.sh`.

Add links here as you find them. Keep one line of "why it's useful" per link.

## Hackathon
- [Hackathon home](https://amazonappdev2026.devpost.com/): tracks, prizes, judging criteria
- [Official rules](https://amazonappdev2026.devpost.com/rules): submission requirements, "obvious vs creative" examples per track
- [Resources](https://amazonappdev2026.devpost.com/resources): official SDK/sample list (summarized below)
- [AWS credit request form](https://forms.gle/GaHFxSbBQNG9Kti6A): $150, due Oct 21 12pm PT, first-come first-served, ~5 business days. Must name your track in the description. (The rules page links `forms.gle/5hyhr1u6x3fuV2aW7`; it's the same form.)
- Live office hours: schedule + join link posted on the hackathon landing page

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
- [Fire Devices & Appstore forum](https://community.amazondeveloper.com/c/fire-apps/17)
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

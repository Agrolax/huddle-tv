# Community & platform research (Oct 6)

Sources: [Fire Devices & Appstore forum](https://community.amazondeveloper.com/c/fire-apps/17), [dev.to/amazonappdev](https://dev.to/amazonappdev), [Announcing Vega OS](https://developer.amazon.com/apps-and-games/blogs/2025/09/announcing-vega-os), [ADBT get started](https://developer.amazon.com/docs/adbt/get-started), [AFTVnews on Vega OS 2.0](https://www.aftvnews.com/vega-os-2-0-on-the-new-fire-tv-stick-4k-is-plagued-by-an-app-icon-issue/).

## 1. What developers are asking for (Fire Devices & Appstore forum)

The category is mostly **support complaints**, not product ideas (29 threads, Aug 13 – Oct 6). Only a handful are real suggestions, and Amazon's reply to each was "we'll share it with the team".

| Theme | Threads | Takeaway |
|---|---|---|
| Support is hard to reach | "No response to support cases at all" (13 replies), "Cannot respond to Alexa support query, all links lead to DevAssistant chatbot", "Unable create a ticket" | Don't plan on Amazon support for blockers. Use Discord, the Devpost forum, and the in-hackathon office hours |
| Account registration stuck | Five+ threads (business-name validation, CORS error on devportal-eu, identity verification loop; one has 319 views) | Avoid anything that needs a new Appstore publisher account. We only need sideload + APK |
| Feature requests | Bring back **developer replies to customer reviews**; make **Retention Offers** available on devices, not only web | Appstore-side only. Not relevant to Huddle |
| SDK / platform bugs | Fire TV purchase hangs on IAP SDK 3.0.9 (2.x works); Luna controller Menu button blocked in Xbox app; **WebView video black on Fire TV Stick 4K Max** (old Amazon WebView, fixed in AWV 146); **mDNS AAAA flood (~2,600 packets/s)** on Fire OS 7.7 when idle | WebView video is a trap: use native playback or avoid video in WebViews. We don't do local-network discovery, so mDNS is not a risk (the phone companion pairs through the server) |
| Metrics | Sales/download drops, stats mismatches | Not relevant |

**What this means for Huddle**
- No one on the forum is asking for a household home screen. The demand evidence is elsewhere, and already in [references.md](references.md): custom-launcher popularity, and the Vega 2.0 launch complaints below.
- Forum friction is a good source of **friction-log** material. We should log the ones we hit ourselves; don't copy other people's.

## 2. Vega OS 2.0 launch complaints (the strongest demand signal)

The new **Fire TV Stick 4K runs Vega OS 2.0** (launched ~Oct 2026, per dev.to Oct 4 news: "the device most new customers will open your app on"). AFTVnews (Oct 2) reports a 1.8-star launch:
- Home screen **apps can't be reordered**
- New apps **don't show up**, or show as the **same gray generic icon**
- **No sideloading at all**, no custom launchers
- Fewer apps overall (no DVR/file-manager/VPN variety, no downloadable games)

Amazon shipped a fix for the icons. The reorder, personalisation and sideloading complaints stand.

**Implication:** an app-grid + household "adapts to who's watching" home is answering a complaint people are actively voicing. It's a stronger story than "launcher replacement" (which can't exist on Vega anyway). Use it in the pitch: *"the home screen can't be customised, so we put a shared household layer inside an app."*

**Decision (Oct 7):** the build target is **Vega OS**, demoed on the Vega Virtual Device. The Stick HD on Fire OS 8 cannot run it. Launching other apps is React Native `Linking` (see [architecture](../architecture/architecture.md#4-app-launching)). How judges weight Vega vs Fire OS is still unanswered on Discord / Devpost. Content Launcher is the API a media app implements so the system can open *it*; Huddle calls out with `Linking` unless a spike says otherwise. The Content Launcher doc page returned HTTP 500 when I first tried it; the [0.24 guide](https://developer.amazon.com/docs/vega/0.24/content-launcher-integration-guide) loads now.

## 3. What Amazon is pushing (dev.to/amazonappdev, last 6 weeks)

| Date | Post | Relevant to us |
|---|---|---|
| Oct 4 | New Fire TV Stick 4K (Vega OS 2.0, Alexa+, new remote); **Live App Testing: up to 5 parallel tracks**; multi-TV sample updated to **Vega SDK 0.24**; hackathon: **$190K prizes, through Oct 23** | Sample repo changed: re-pull `reference/react-native-multi-tv-app-sample`. Alexa+ on Fire TV now does cross-subscription search + watchlist recs: our Tonight picker must differ (household-aware, multi-profile) |
| Sep 8 | **Fire TV Beta program** (pre-release Fire OS builds); hackathon Fire TV build-session video ([YouTube](https://www.youtube.com/watch?v=ws61g53S2b4)); User-Agent handling for Vega WebView | Watch the build-session video for track hints |
| Aug 31 | Hackathon launch; **Fire OS → Vega migration via ADBT**; [Vega EPG sample](https://github.com/AmazonAppDev/vega-epg-sample), [multi-TV helloworld](https://github.com/AmazonAppDev/react-native-multi-tv-helloworld) | EPG sample is a useful reference for a "Tonight" grid |
| Aug 24 | **Alexa+ free on Fire TV for all US users**; **OpenIAP** adds Fire OS + Vega; Alexa+ add-ons can take payments | Alexa+ is now on every Fire TV, so "voice on TV" is table stakes. Our edge is the phone mic + family context |

## 4. Vega OS announcement (Sept 2025), in short
- Linux-based OS for Fire TV Stick 4K Select and new Echo devices. Amazon stays "a multi-OS company": Fire OS keeps getting devices and existing apps stay supported.
- Build with **React Native for Vega** (RN 0.72, turbo modules in C++) or **Vega WebView**. Tools: VS Code extension, CLI, docs, forum, YouTube. It was in open beta then; it's a full launch now.

## 5. What to download / install

Already on this Mac: Node 22.20, npm/pnpm/yarn, git, Homebrew, **VS Code**, Cursor, Java 25. Already installed in the project: ADBT MCP server + skills + `.claude/amazon-devices/`.

**Missing (nothing installed yet; ask before I run any of these):**

| Tool | Needed for | Command / source |
|---|---|---|
| Vega SDK 0.24 + Vega Virtual Device | **The build.** CLI, libraries, simulator. Mac or Linux only. Installer is interactive and wants ~20 GB | `curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh \| bash && source ~/vega/env`, then `vega --version`. [Install docs](https://developer.amazon.com/docs/vega/0.24/install-vega-sdk.html) |
| Android Studio + SDK + JDK 17 + `adb` | Not the build target anymore. Only useful if we later add a Fire OS build | skip |
| AWS CLI (+ credentials) | Bedrock, DynamoDB, S3, Polly, Transcribe | `brew install awscli`, then `aws configure` / SSO. Bedrock model access must be enabled per account (Bedrock access problems go to the AWS Support subreddit) |
| Docker | Only if we containerise the hosted demo server | optional |
| Fire TV Beta enrollment | Test against pre-release Fire OS | optional; not needed |
| Discord (hackathon server) | Async support, shared links, Q&A | join via the Devpost page |

Stick setup (no download): Developer Options → ADB debugging + unknown sources, then `adb connect <ip>:5555` ([README › Setup](../../README.md)).

**ADBT notes:** `npx -y @amazon-devices/amazon-devices-buildertools-mcp@latest init-context` (needs Node ≥ 18; Node 24 if the MCP server fails on Node 26). Recommended verification: ask the agent to "List the tools provided by Amazon Devices Builder Tools".

## 6. Doc inconsistencies spotted (candidates for the friction log)
- ADBT get-started says `init-context`; the Vega guide blog says `--init-context`.
- The Vega guide blog installs SDK **0.23.8128** while the Oct 4 news and sample target **0.24**.
- Vega `content-launcher-overview` (0.24) returned HTTP 500.
- The migration guide (community KB) recommends a specific model name for its workflow but doesn't say what happens with others.
These are observations from reading docs, not yet hit while building. Log them as friction only if they actually cost us time.

## 7. Wider search (Reddit was unreachable)
Reddit is blocked for every tool available here (search, fetch, built-in browser), so **none of this is Reddit data**. Sources: Devpost hackathon forum, Amazon announcements, GitHub, tech press (Tom's Guide, Cord Cutters News, Gadget Hacks). If Reddit matters, search r/fireTV and r/FireStick by hand for "home screen", "profiles" and "Vega".

### 7a. Biggest finding: Fire TV's 2026 update already covers part of Huddle
Amazon's Jan 2026 redesign ([Amazon](https://www.aboutamazon.com/news/devices/new-fire-tv-upgrades-features-2026), [Cord Cutters](https://cordcuttersnews.com/amazons-biggest-fire-tv-upgrade-yet-smarter-search-a-new-alexa-hub-and-watchlists-that-travel-with-you/)) and the Oct 2026 Alexa+ expansion now ship:
- **Reorder apps** and **pin up to 20** (so the Vega 2.0 reorder complaint is for the new stick only; Fire OS has it)
- **Alexa+ discovery** that uses subscriptions, viewing history and availability, plus conversational "something like X" requests
- **Watchlists from the Fire TV phone app** with a Continue Watching row
- **Ambient / Amazon Photos**, an Alexa+ hub, and shortcuts to Ring cameras and smart-home controls

This is the "don't reinvent the wheel" trap from office hours. A plain app grid, a single-user "what should I watch" picker, a photo screensaver and a Ring tile are all covered.

**What the coverage doesn't mention** (Cord Cutters lists it as a gap): **multi-profile household features and parental controls.** That's where Huddle should lead:
- A shared **family board**: agenda, chores and notes that adapt to *who's in the room*
- **Group Tonight**: one pick that works for several people ("funny, ≤90 min, kids included")
- **Phone → TV** posting and voice input, with the TV as a shared household dashboard
- Care mode and kids mode

Drop or demote anything in the MVP that is "nicer version of Amazon's feature" (plain app row, photo slideshow, Ring tile). Keep the pitch on the household layer.

### 7b. Vega 2.0 ecosystem numbers ([Gadget Hacks](https://cord-cutters.gadgethacks.com/news/amazon-fire-tv-vega-os-explained-app-gaps-and-lost-sideloading/))
- About 1,257 Vega apps vs 30,000+ on Fire OS. Only 53% of the top 100 Fire TV apps exist on Vega. Zero games, zero books/comics, no fitness apps.
- **No migration path, only a rewrite.** Vega ships with 1 GB RAM, half the previous stick, so tight memory budgets matter.
- Vega apps are in short supply, so a Vega-native household app has less competition. The cost is that sideloading is off for consumers, which matters for judges (a signed APK is Fire OS only; Vega would need a VVD or a device in developer mode).
- The multi-TV sample is mid-migration: RN 0.72 → 0.83 PR ([#132](https://github.com/AmazonAppDev/react-native-multi-tv-app-sample/pull/132), still open) and SDK 0.24 build fixes (#130: needs Node 22.14+, Yarn 4, no spaces in the checkout path). Pin a known commit before building on it.

### 7c. Devpost forum: answers from the organizers (Emerson Sklar, Janet Fang)
| Question | Answer | For us |
|---|---|---|
| What are you looking for in the Fire TV track? ([thread](https://amazonappdev2026.devpost.com/forum_topics/45396-what-exactly-are-you-looking-for-in-the-fire-tv-track)) | Fire TV projects can fully integrate with the SDKs and run on real devices. Basic design or deeper integration both work, but the judging criteria apply | Real-device demo is a plus. **Still no word on Vega vs Fire OS**, so this stays an open question |
| Private backend OK? ([thread](https://amazonappdev2026.devpost.com/forum_topics/45420-repository-requirement-private-backend-service-hosted-separately-with-judge-credentials)) | Yes, if judges get credentials and instructions; compared to using third-party libraries | Our hosted demo server can stay private, but ship the code anyway (Open Source challenge) |
| Devices required? ([thread](https://amazonappdev2026.devpost.com/forum_topics/45263-demo-video)) | No devices required | Confirms the VVD / emulator is acceptable for the video |
| One project in two tracks? ([thread](https://amazonappdev2026.devpost.com/forum_topics/45333-can-one-project-be-submitted-to-both-fire-tv-and-alexa-tracks)) | Yes, judged in both, can only win one | The MCP-server bonus idea could count toward Alexa+ if it's real. Don't build it for that alone |
| Mini challenges standalone? ([thread](https://amazonappdev2026.devpost.com/forum_topics/45310-question-related-to-mini-challenge)) | No, only on top of a main-track submission. Open Source work from earlier weeks is fine | Matches our plan |
| **Bedrock quotas all 0 on a new AWS account** ([thread](https://amazonappdev2026.devpost.com/forum_topics/45416-bedrock-blocked-on-a-new-aws-account-all-model-quotas-0-not-adjustable-need-escalation)) | "We do not have a way to escalate", ping u/AWSSupport on Reddit | **Direct risk to us.** Our AWS account is new. Verify Bedrock access this week |

Other threads worth a skim: AWS credit rejections with template replies (9 replies), media-footage copyright (4 replies), demo video (7 replies).

49,187 participants are registered. The project gallery isn't published yet, so I couldn't check what other Fire TV entries look like.

## 8. Installed on this Mac (Oct 7)
| Item | Status |
|---|---|
| ADBT MCP server (`amazon-devices-buildertools-mcp`) + Amazon skills | already installed, connected |
| **AWS Knowledge MCP** (`aws-knowledge`, remote HTTP, user scope) | added, connected. Endpoint is from AWS announcements via third-party reports; I couldn't open AWS's own doc page. Free, no auth, rate-limited |
| Vega prerequisites: binutils, coreutils, gawk, findutils, grep, jq, gnu-sed, lz4, watchman | installed (Rosetta was already present) |
| AWS CLI 2.37 | installed. **Not configured**: needs your credentials (`aws configure sso`) |
| VS Code extension `amazon-devices.kepler-studio` (Vega Studio 0.24.1) | installed (reload VS Code) |
| **Vega SDK + Vega Virtual Device** | **not installed**: installer is interactive and the ADBT workflow says you run it. Disk is also tight |
| Android Studio + JDK 17 + adb | **not installing**: Fire OS is no longer the build target |
| Bedrock / Polly / Transcribe / DynamoDB SDKs | added to `apps/server` when it's scaffolded (it's still just a README) |

Disk was **4.1 GB free (98%)** after the installs. Android Studio + SDK needs ~10 GB; the Vega SDK + emulator image is multi-GB. Free space before either.

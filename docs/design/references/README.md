# Design references

Internal reference images for the design pass. Not for redistribution: each image belongs to its source. Images are resized to at most 1600 px wide JPG. What to copy (and what not to) is in [`../references.md`](../references.md).

Collected Oct 15 2026.

## vega-os/

Current Fire TV on Vega OS. The 2026 UI (Jan 2026 redesign, shipped on Vega OS 2.0 with the Sept 2026 Fire TV Stick 4K) and the 2025 Fire TV Stick 4K Select (Vega OS 1.1).

| File | Source | Take from it |
|---|---|---|
| `01-home-2026.jpg` | Amazon News, [Fire TV upgrade (Jan 2026)](https://www.aboutamazon.com/news/devices/new-fire-tv-upgrades-features-2026) · [image](https://assets.aboutamazon.com/1d/49/e027bbeb4eec97f0248687ed3ac1/aa-jan2026-firetv-inline-v2b-ui-home-1600x900.jpg) | **Layout, density.** Icon top nav, hero in the top ~45%, then rows: 16:9 tiles (~320×180 at 1080p), small app tiles (~150×84), one full-width banner. Left edge ~100 px (≈5%). Gaps ~24 px. Rounded corners ~12 px |
| `02-movies-tab-2026.jpg` | Amazon News, same article · [image](https://assets.aboutamazon.com/6d/b9/a5bcab3d4bc6b1fe08e58debb627/aa-jan2026-firetv-inline-v1b-ui-movies-1600x900.jpg) | **Focus on nav.** Focused tab = white rounded square, dark icon, label appears under it. Unfocused tabs are icons only. Secondary pill button ("Learn more") is grey, not outlined |
| `03-tv-shows-tab-2026.jpg` | Amazon News, same article · [GIF](https://assets.aboutamazon.com/39/c9/b843b1774409918c27d9d1a38886/firetv-ui-scroll-hero-v2-compressed.gif) (frame) | **Row rhythm.** Two full rows of 16:9 tiles under the hero; the page scrolls vertically, rows scroll horizontally |
| `04-alexa-plus-cards.jpg` | Amazon News, [Fire TV Stick 4K (Sept 2026)](https://www.aboutamazon.com/news/devices/fire-tv-stick-4k-new-remote) · [GIF](https://assets.aboutamazon.com/ba/07/c50c84bb4212b9ae6f1473cb3b59/fire-tv-alexa-hub-gif-2000x1125.gif) (frame) | **Alexa+ cards, color on dark.** Navy background, short one-line prompts on dark-blue cards with a small icon, focused card gets a lighter edge. Closest Amazon pattern to our widget tiles |
| `05-photos-buttons-grid.jpg` | Amazon News, Jan 2026 article · [image](https://assets.aboutamazon.com/fe/81/71d5e88f4f24950055edc7717e70/aa-jan2026-firetv-inline-v5-amazonphotos-1600x900.jpg) | **Focus treatment for buttons.** Focused pill = white ring with a dark gap around the pill; others are flat grey pills. Centered small page title. Ignore the glowing Alexa bar at the bottom |
| `06-4k-select-alexa-actions.jpg` | AFTVnews, [20 missing or worse features on the 4K Select](https://www.aftvnews.com/20-missing-or-worse-features-on-the-fire-tv-stick-4k-select/) · [image](https://www.aftvnews.com/wp-content/uploads/2025/10/Alexa-Quick-Shortcut-Actions.jpg) | **Real Vega OS 1.1 screen** (not a render). Quick-action cards: icon + 2–3 line label, focused card has a light outline. Hint line above: "Press and hold … then speak" |
| `07-4k-select-appstore-focus.jpg` | AFTVnews, same article · [image](https://www.aftvnews.com/wp-content/uploads/2025/10/Fire-TV-Stick-4K-Select-Appstore.jpg) | **Tile focus.** Focused tile = 3–4 px white outline with a small gap, slight scale. Row titles in ~24 px white, left-aligned to the tiles |
| `08-4k-select-settings-list.jpg` | AFTVnews, same article · [image](https://www.aftvnews.com/wp-content/uploads/2025/10/Fire-TV-Stick-4K-Select-Application-Options.jpg) | **Settings / list focus.** Three columns: big icon + section name, list, helper text. Focused row is inverted (white fill, dark text). Small caps section label |
| `09-4k-select-settings-helper-text.jpg` | AFTVnews, same article · [image](https://www.aftvnews.com/wp-content/uploads/2025/10/Fire-TV-Stick-4K-Select-Developer-Options.jpg) | **Copy tone.** Helper text says what the option does in one or two plain sentences. Good model for our sheets (Connect, Home) |
| `10-whos-watching-profiles.jpg` | PCMag, [Fire TV new user experience (2020)](https://www.pcmag.com/news/amazon-unveils-30-fire-tv-stick-lite-new-user-experience-for-fire-tv) · [image](https://i.pcmag.com/imagery/articles/02dU2r9g7VVxGsujVn9bKxV-3..v1600973859.jpg) | **Profile picker.** "Who's watching Fire TV?" title, a single centered row of round avatars with names under them, "Add Profile" at the end, focused avatar larger. Older UI, but the 2026 picker keeps this shape. Our Who's here screen should feel like this |
| `11-vega-carousel-selection-border.jpg` | Vega docs, [VUIC Carousel](https://developer.amazon.com/docs/vega-api/0.23/carousel.html) · [image](https://m.media-amazon.com/images/G/01/mobile-apps/dex/vega/selectionborderprops._TTH_.jpg) | **Vega UI component focus.** The Carousel `selectionBorder` default: light border inset from the tile with a gap. Confirms "outline + gap" as the platform focus look |
| `12-remote-keys.jpg` | StreamingMediaBlog, [Hands on with Vega OS Fire TV Stick](https://www.streamingmediablog.com/2025/10/vega-firetv.html) · [image](https://www.streamingmediablog.com/wp-content/uploads/2025/10/two.jpg) | **Remote.** Keys we can rely on: D-pad, Select, Back, Home, Menu (≡), play/pause. No number keys. Use these names in copy |

Not saved (links only):
- Amazon help, [Navigate the New Fire TV Experience](https://www.amazon.com/gp/help/customer/display.html?nodeId=TIqaEli7NUK9mDKvyr): key names and what Home / Menu / long-press Select do. Images are only icons.
- Vega docs, [Focus Management](https://developer.amazon.com/docs/vega/0.23/focus-management): focus best-practice diagrams (code-level, not visual style).
- Amazon News, [Fire TV Stick 4K + Vega 2.0](https://www.aboutamazon.com/news/devices/fire-tv-stick-4k-new-remote): product shots only.
- YouTube reviews: [Lon.TV 4K Select hands-on](https://www.youtube.com/watch?v=ApI-oNPz_kI), [NEW Fire TV Stick 4K review](https://www.youtube.com/watch?v=NWRr86zuuMI). Good for motion and focus timing; no stills saved.

## moodboard/

The feel we want: Jackbox and Kahoot energy for the game, Skylight calm for the home, ambient TV restraint. No gradients, glass, sparkles or emoji grids.

| File | Source | Take from it |
|---|---|---|
| `jackbox-room-code-lobby.jpg` | Steam, [The Jackbox Party Pack 10](https://store.steampowered.com/app/2216830/The_Jackbox_Party_Pack_10/) (store screenshot) | **Join flow, players.** Room code in big letter boxes bottom-left, "Join at jackbox.tv", players as a row of characters with names. Model for our Connect sheet and Sketch it lobby |
| `jackbox-players-row.jpg` | Steam, same page | **Player row, color.** Saturated flat color blocks, every player has a name label and a score. Bold, no gradients |
| `jackbox-question-avatars.jpg` | Steam, same page | **Type scale.** One huge prompt line, answers as short flat bars, avatars along the bottom with names and points |
| `kahoot-get-ready.jpg` | Kahoot! blog, [Teacher Takeover: offline](https://kahoot.com/blog/2026/09/21/teacher-takeover-unplugged-offline/) · [image](https://kahoot.com/files/2026/03/image-60.png) | **Interstitial.** One white label card on a flat purple field: "Get ready to play". Model for "Round starts" screens |
| `kahoot-answer-tiles.jpg` | Kahoot! blog, same article · [image](https://kahoot.com/files/2026/09/Team-tiles-1-scaled.png) | **Big tiles.** Big flat color tiles with one number or word each, team chips on top. Readable from across the room |
| `skylight-calendar-columns.jpg` | Skylight, [Calendar](https://myskylight.com/calendar) · [image](https://cdn.shopify.com/s/files/1/1353/3805/files/bau_cal_usa_desktop.webp) | **Family calendar.** One column per person with avatar + name on top, events as soft pastel blocks. Color = person, consistently |
| `skylight-in-kitchen.jpg` | Skylight, same page · [image](https://cdn.shopify.com/s/files/1/1353/3805/files/family-kitchen-calendar.webp) | **Context.** Glanceable from across a kitchen: big date, few words per event |
| `skylight-event-cards.jpg` | Skylight, same page · [image](https://cdn.shopify.com/s/files/1/1353/3805/files/cal-feature-planning.webp) | **Event card.** Date heading, one-line title, small time, person dots. Model for our calendar rows |
| `google-tv-ambient-clock.jpg` | Google blog, [The photographers behind Google screensavers](https://blog.google/products-and-platforms/platforms/google-tv/google-devices-screensavers-photography/) · [image](https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Inline_1.width-1200.format-webp.webp) | **Ambient.** Full-bleed photo, one light clock bottom-right, nothing else. Our ambient mode should be this quiet |
| `google-tv-ambient-calm.jpg` | Google blog, same article · [image](https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Inline_2.width-1200.format-webp.webp) | **Ambient.** Same, different photo. Clock weight is light, small, in the safe area |
| `apple-tv-top-shelf.jpg` | Apple HIG, [Top Shelf](https://developer.apple.com/design/human-interface-guidelines/top-shelf) · [image](https://developer.apple.com/tutorials/images/com.apple.HIG/components-top-shelf-intro~dark@2x.png) | **Structure only.** A content shelf above an app dock; the focused app drives the shelf. Ignore the HIG placeholder color and tvOS 26 glass |
| `apple-tv-focus-safe-zone.jpg` | Apple HIG, same page · [image](https://developer.apple.com/tutorials/images/com.apple.HIG/icons-and-images-content-layout-16x9~dark@2x.png) | **Focus growth.** Art has an unfocused size, a focused size and a safe zone. Leave room around tiles so a 1.05 scale does not clip or overlap |

Not saved (links only):
- Kahoot! [press kit](https://kahoot.com/library/press-kit/): photos are in a PDF; no screen stills on the page.
- Apple Newsroom, [tvOS 26](https://www.apple.com/newsroom/2025/06/apple-tv-brings-a-beautiful-redesign-and-enhanced-home-entertainment-experience/): Liquid Glass; against our no-glass rule, so not kept.
- Fire TV design system portfolio (Jessica Miller), [jessjessdesigns.com](https://jessjessdesigns.com/portfolio-item/amazon-fire-tv-design-system/): an Amazon designer's case study, worth a look; personal portfolio, so not copied.

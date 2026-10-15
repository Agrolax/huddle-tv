# Vega OS conventions for Huddle

What Huddle copies from the Fire TV home on Vega OS so it feels native, and where it differs on purpose. Images and sources: [`references/README.md`](references/README.md). Measurements are read off Amazon's 2026 press renders and AFTVnews device captures, scaled to 1920×1080, so treat them as ±10%.

## Match the platform

| Area | What Fire TV / Vega does | What Huddle does | Ref |
|---|---|---|---|
| **Safe area** | Content starts ~100 px from the left edge, nav ~75 px from the top. Vega's System X-Ray has a Safe Zone overlay for overscan | Keep `space.safeX` 96 / `space.safeY` 54. Check screens with the X-Ray Safe Zone switch on | vega-os/01 |
| **Focus: tiles** | 3–4 px light outline, inset with a small dark gap, slight scale. The VUIC Carousel `selectionBorder` default looks the same | Keep scale 1.05 and the 4 px ring, but **add a 4 px gap** between tile and ring (today the ring is inset on the tile). Ring color stays amber, see "Differ" | vega-os/07, 11 |
| **Focus: buttons and pills** | Focused pill gets a white ring with a gap; unfocused pills are flat grey. Nav tab: white rounded square, dark icon, label shown only when focused | "Connect phone", "Done", "Continue" use the same ring-with-gap. No fills that change hue on focus | vega-os/02, 05 |
| **Focus: lists** | Settings rows invert on focus: white fill, dark text | Use the inverted row for list-style UI (smart-home device list, settings if we add any) | vega-os/08 |
| **Focus timing** | Focus moves feel instant; rows slide, the page scrolls vertically | 160 ms focus (`focus.duration`), no bounce. Already in the design guide | — |
| **Tile proportions** | 16:9 content tiles ~320×180, app tiles ~150×84, full-width banner ~1700×135. Gaps ~24 px. Corner radius ~12 px | Tonight posters use 16:9 at ≥ 320×180. Gaps `space.md` 24. Use `radius.md` 16 for tiles (close enough; one radius everywhere) | vega-os/01, 03 |
| **Typography** | Amazon Ember-like sans, regular weight. Row titles ~24 px, tab label ~22 px, body/helper ~24 px, hero titles are artwork | Keep our floors (body 28, caption 22). Use regular/medium weights; bold only for the greeting and numbers (clock, scores). No condensed or light weights | vega-os/07, 08 |
| **Color on dark** | Near-black (#0F1111-ish) behind content; Alexa+ and Photos use a deep navy. White text, grey secondary. Color comes from artwork, not chrome | Our `bg #0E1218` and `surface #1A222D` sit right in this range. Keep chrome neutral; widget accents only on the top rule and label | vega-os/04, 05 |
| **Contrast** | Vega accessibility guide: text ≥ 4.5:1 (≥ 3:1 for large), focus color differs from the background | Check `mute #9AA3B2` on `surface` (≈ 6:1, passes). Never put caption-size text in a widget accent color | — |
| **Back** | Back goes one level up. At the root, Vega guidance is to warn first, then exit on a second Back | Sheets (Connect, Home) close on Back and return focus to the opener. Home → Who's here. **Who's here → exit today without a warning: add a "Press Back again to exit" toast** | — |
| **Remote words** | Keys: Select, Back, Home, Menu, play/pause, D-pad. Hints say "Press and hold … then speak" | Hints name keys the same way: "Select to …", "Press Back to …". See the UI copy standard | vega-os/06, 12 |
| **Helper text** | Settings show one or two plain sentences that say what the option does | Sheets get one short subline in the same voice | vega-os/09 |
| **Profiles** | "Who's watching Fire TV?" centered row of round avatars, names under, Add at the end | Who's here keeps this shape (centered row, round avatars, names under). Our difference: you pick several people | vega-os/10 |

## Differ on purpose

| Area | Fire TV | Huddle | Why |
|---|---|---|---|
| **Home layout** | Hero + content rows (a store) | A widget grid: 3 + 3 tiles of different widths, no hero art | A family dashboard to glance at, not a catalog. Skylight-style, not a shelf |
| **Focus color** | White ring | Amber ring (`colors.focus`) | Ties focus to the Huddle brand and stays visible on photos. Shape (ring + gap) matches the platform, color does not |
| **Accent per widget** | One blue accent (Alexa) | One accent per widget (`colors.widget.*`) on the top rule and label | People find "the calendar one" by color from the sofa. Color is never the only signal (labels too) |
| **Profiles** | One person per profile, chosen at wake | Several people at once ("Who's here") | The household is the user. The greeting, Tonight picks and calendar filter use the whole group |
| **Text input** | On-screen keyboard and voice | No text input on the TV. The phone types | The phone is faster, and it gives the second screen a job |
| **Game screens** | — | Sketch it uses Jackbox/Kahoot rules: big flat color fields, one huge prompt, a player row with names and scores, room code in letter boxes | Party energy in the game only; the home stays calm |
| **Ambient** | Photos + Alexa widgets | Google TV-style: one photo, a small light clock, the next event at most | Calm when nobody is using it |

## Do not copy

- The Alexa+ glow bar and the gradient fades under hero art (vega-os/04, 05). No gradients, glass, sparkles or emoji grids.
- tvOS 26 Liquid Glass. Take Apple's top-shelf structure and focus-growth rule only.
- Ad-like hero banners. Huddle has no promoted content.

## Changes for the design pass

Notes only; app code stays as is until the final design pass.

1. Focus ring: move from inset to outset with a 4 px gap (`FocusRing` in `packages/tv-focus-kit`).
2. Who's here: center the avatar row; focused avatar scales; names under avatars.
3. Root Back: "Press Back again to exit" toast on Who's here.
4. Smart-home sheet: device rows use the inverted-row focus.
5. Tonight posters: 16:9, at least 320×180.
6. Apply the [UI copy standard](design-guide.md#ui-copy-standard) string changes.

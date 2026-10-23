# Redesign brief (Oct 23)

You own the redesign and the workflow. This is a menu and a checklist, not a decision. Screens and their states: [screen-inventory.md](screen-inventory.md). Rules and tokens: [design-guide.md](design-guide.md), `packages/shared/src/theme.ts`. What is real and what is simulated: [customizing.md](../product/customizing.md).

## What the redesign has to fix (what a judge will see)
- Home reads as a plain dashboard: flat grey tiles, no imagery. The Tonight tile is three empty grey boxes until a mood is chosen.
- Tonight picks have no posters. Titles come from a model, so real artwork needs a data source we do not have; design the card so it works without art (a typographic poster, colour from the mood).
- "Who's here" is the pitch ("it knows who's on the couch") but Home barely changes when different people are present.
- The phone page is one long scroll of cards.
- Nothing carries the brand (no logo, cover or colour story).

## Scope options
| Tier | What changes | Cost | Why |
|---|---|---|---|
| **A. Skin** | Colours, type, spacing, tile shapes, focus ring, in `theme.ts` and the tile components. Same layout and flow | Low | Safest; the demo script and key presses keep working |
| **B. Key screens** | A plus new designs for Home, Tonight sheet and the quiz question | Medium | The three screens in most of the video |
| **C. Phone** | B plus the phone: tabs or a bottom bar instead of one scroll, a big "your turn" screen for votes and games | Medium | The phone is where the product is touched |
| **D. Flow** | C plus a first-run setup and tastes (the [onboarding plan](../product/onboarding-plan.md)) | High | A new feature; not recommended before the deadline |

Recommendation: A plus the Home tile content and the Tonight card from B. It is what a few hours buys, and the video can be re-recorded after it.

## Ideas worth drawing
1. **Home adapts to who's here.** Greeting names the people; Tonight tile headline says "For Rafi & Nanu · ends by 9:30"; a kid in the room tints the corner and shows a moon for bedtime.
2. **Tonight card without posters.** Big title, year and runtime, one-line reason, and a service chip. Colour comes from the mood (cozy warm, funny bright, edge-of-seat deep).
3. **Secret vote as a hand-off moment.** On the TV, avatars fill with a check as phones vote, never showing how. On the phone, one pick per screen, large Yes and No.
4. **Quiz in the Kahoot language.** Four big A-D answers with the existing shape-plus-letter colours, a shrinking timer bar, a podium on the final scores (our moodboard has Jackbox and Kahoot).
5. **Sketch the pick board** as a paper pad, with the hint letters as slots.
6. **Door alert** as a small card with a camera icon and a "Demo" tag so nobody thinks it is a real Ring feed.
7. **Cover and brand:** a wordmark, one accent, and a mark that reads at 64 px (a house with a play triangle, or four dots under a roof).

## Process (Figma, then code)
1. Frames at 1920×1080 for Who's here, Home, Tonight sheet, quiz question, quiz reveal, final scores, Sketch board; phone frames at 390×844 for the join page, Home, vote, quiz answer, draw. Keep content inside the 5% safe area; text at least 28 px for body, 36 px for titles.
2. Variables for colour, type, spacing and radius, so they map straight to `theme.ts`.
3. Hand over finished frames, not every tweak. Send the frame link; the Figma MCP can pull the frames and I turn them into `apps/tv/src` code and rebuild.
4. Check on the Vega Virtual Device, not the canvas (focus ring, text size, safe area).
5. Put the demo back: `node scripts/demo/record.mjs --dry`, then record and render ([README](../../README.md#redesigning-the-ui-then-putting-the-demo-back)). Replace the gallery stills.

## Deliverables beyond the app (for Devpost)
| Asset | Spec | Where it goes |
|---|---|---|
| Cover / thumbnail | 3:2 (for example 1500×1000), the wordmark and one hero shot of the TV | Devpost project image |
| Gallery stills | 1920×1080 PNG, three to five | [gallery/](../submission/gallery/) |
| Architecture picture | One slide, matches [architecture.md](../architecture/architecture.md) | Gallery or video |
| Video title card | 1920×1080 | Replaces the first card in `scripts/demo/assemble.mjs` if you like |

## Decisions that are yours
Tier A, B, C or D. Playful or calm (the guide leans calm home, playful details). Whether the phone changes. Whether to keep the amber focus ring or the white Vega ring (the theme uses white; `references.md` still lists an amber ring as a deliberate difference).

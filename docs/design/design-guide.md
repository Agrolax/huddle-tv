# Design guide

## Process
1. **Wireframes**: [`wireframes.html`](wireframes.html) (layout + focus only)
2. **Figma, phase 1 only**: Who's here, Home, launching overlay. Tonight, phone, ambient, and games come after those three frames exist
3. **Tokens**: colour, type, spacing, radius, focus style → `packages/shared/theme`
4. **Code**: send Claude the Figma frame link; it pulls frames via the Figma MCP
5. **Iterate on device**: the TV is the truth, not the Figma canvas

Figma notes: work in the `Saf` or `Laurier` team (full seats). The Starter plan caps MCP calls (~20/session), so hand off finished frames, not every tweak.

### Tool options
| Tool | Use for | Verdict |
|---|---|---|
| **Figma** | Screens, components, tokens, handoff | **Default** |
| **ProtoPie** | Linked phone ↔ TV prototypes | Great for storyboarding the demo before code |
| **Rive** | Animated widgets, ambient-mode motion, avatars | Optional. RN runtime exists. |
| **Framer** | Phone companion prototypes | Optional |
| **Penpot** | Open-source Figma alternative | Only if Figma limits bite |

## 10-foot UI rules
- Canvas **1920×1080**. Keep content inside a **~5% safe margin** (TV overscan).
- Body text ≥ 28px, titles ≥ 48px at 1080p. Test readability from 3 m.
- **Focus is the cursor**: every focusable element needs an unmistakable focus state (scale ~1.05–1.1 + outline/glow + elevation). No hover states.
- Remote keys: ↑ ↓ ← → · Select · Back · Home (system, not ours) · Menu · Play/Pause.
- **Back** always goes one level up; from Home it asks before exiting.
- Predictable focus paths: rows scroll horizontally, the page scrolls vertically. Remember last-focused item per row.
- **Never type on the TV.** All text input happens on the phone companion.
- Never use colour alone for meaning.
- Motion: quick (150–250ms) for focus, slower (400–600ms) for page/ambient transitions. Respect reduce-motion.
- Use the `amazon-devices-scalable-ui-audit` skill before submitting (catches hard-coded 1080p assumptions).

## Home screen anatomy

Locked Oct 14. Built in step 1 with placeholder content ([screenshots](../screenshots/step-1/)).

```
┌──────────────────────────────────────────────────────────────────────┐
│ Good evening, Rafi & Nanu                          [Connect phone]   │
│ Dinner at 7 · 14° and clear · nothing new from phones                │
├──────────────┬────────────────────────────────┬──────────────────────┤
│ Clock &      │ Family calendar                │ Who's here           │
│ weather      │ 4:00 Dentist · Ammu …          │ (R)(N)  Select=switch│
├──────────────┴─────────────────┬──────────────┼──────────────────────┤
│ Tonight (Bedrock picks)        │ Sketch it    │ Home (simulated)     │
│ [Cozy] [Funny] [Edge-of-seat]  │ Select=start │ Lamp On · 21° · Lock │
└────────────────────────────────┴──────────────┴──────────────────────┘
```

Focus starts on Clock. Left/Right stay in a row; Up/Down go to the tile with the most overlap, or back to the one you last used in that row. Up from the top row reaches "Connect phone". Focus state: scale 1.05, 4px amber inset ring, lighter surface. Each widget has an accent colour (`colors.widget.*`) for its top rule and label.

Draw the phase 1 frames in the `Saf` or `Laurier` Figma team, 1920×1080, content inside a 5% safe area. The low-fi to trace is the first TV frame in [wireframes.html](wireframes.html).

## Open design questions
- Personality: playful (stickers, avatars) or calm (Apple TV-like)? Probably calm home + playful details.
- How does the home *visibly* adapt when different people are present (colour, order, greeting)?
- Widget sizes: S (1×1), M (2×1), L (2×2)?
- How does a phone post "arrive" on the TV (toast → lands in board)?
- Ambient mode: full-bleed photos with a small clock, or a collage?

## Inspiration
<!-- add links/screenshots: Google TV, Apple TV, Echo Show home, Nest Hub ambient mode, Skylight calendar, Plex -->

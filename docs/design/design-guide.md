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
- Body text ≥ 28px, tile and card titles ≥ 36px, screen headlines ≥ 48px at 1080p. Test readability from 3 m.
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

Focus starts on Clock. Left/Right stay in a row; Up/Down go to the tile with the most overlap, or back to the one you last used in that row. Up from the top row reaches "Connect phone". Focus state (design pass, Oct 16): scale 1.04, 4px white ring outset by a 4px gap (the Vega platform treatment), lighter surface. Chrome is neutral (near-black page, flat grey tiles); colour comes from people's avatars and posters, not per-widget accents. One blue primary button per screen. Shared TV pieces live in `apps/tv/src/components/ui.tsx` (`Sheet`, `Button`, `Avatar`, `focusLook`).

**Door alert:** a doorbell ring or motion shows a card bottom left for 15 s (title, camera, time; snapshot when the source has one). It never takes focus. Bottom left keeps it off the header (Connect phone is often focused) and opposite the message toast (bottom right) so both can show.

Draw the phase 1 frames in the `Saf` or `Laurier` Figma team, 1920×1080, content inside a 5% safe area. The low-fi to trace is the first TV frame in [wireframes.html](wireframes.html).

## Open design questions
- Personality: playful (stickers, avatars) or calm (Apple TV-like)? Probably calm home + playful details.
- How does the home *visibly* adapt when different people are present (colour, order, greeting)?
- Widget sizes: S (1×1), M (2×1), L (2×2)?
- How does a phone post "arrive" on the TV (toast → lands in board)?
- Ambient mode: full-bleed photos with a small clock, or a collage?

## References
- [references.md](references.md): Vega OS conventions to match (focus, tiles, safe area, type, Back, color) and where Huddle differs on purpose.
- [references/](references/README.md): Fire TV / Vega OS screenshots and a moodboard (Jackbox, Kahoot, Skylight, Google TV ambient, Apple TV top shelf), each with its source.

## UI copy standard

All text on the TV and the phone follows a light version of **ASD-STE100 Simplified Technical English**. People read the TV from 3 m away, often while talking, so every line must be short and clear.

### Rules
1. **Short sentences.** At most 15 words for a hint or helper line, 20 for anything else. One idea per sentence.
2. **One instruction per sentence.** Put the action first: "Select a person." Not "To add someone you can select them."
3. **Active voice, present tense.** "The TV shows the change." Not "The change will be shown."
4. **Simple approved verbs**, one meaning each: *select, tap, scan, open, close, add, remove, send, change, start, stop, show, connect, go*. Do not use *choose, pick, click, hit, press OK, flip, switch, toggle, launch*.
5. **No idioms, slang or metaphors.** Not "right away", "coming up", "flip", "the room guesses", "hot take".
6. **No abbreviations** except units (°, min) and "TV". Write "Tomorrow", not "Tmrw".
7. **Full words for state.** "Calendar is offline." Not "Calendar offline." A status chip may be one word ("Offline").
8. **Instructions, not questions,** when the user must act: "Use the same Wi-Fi on your phone and TV." Not "Is your phone on the same Wi-Fi?"
9. **Labels on buttons are verbs or verb phrases**: "Send", "Add event", "Connect phone", "Done".
10. **Sentence case** everywhere. Small-caps labels (CODE) only for short field captions.
11. **Errors say what happened, then what to do,** in two sentences: "The code expired. Scan the new code on the TV."
12. **No emoji in system text.** Emoji typed by people (messages, events) are fine.

### Terms
Use one word for one thing, on both screens.

| Use | For | Do not use |
|---|---|---|
| **Select** | The remote's center key, on the TV | OK, Enter, click, press |
| **Tap** | Touch on the phone | Click, press |
| **Back** | The remote's Back key | Return, exit, ← |
| **phone** | The companion (lowercase in sentences) | mobile, device, companion, remote |
| **TV** | The Fire TV app and screen | Huddle TV, screen, display |
| **Who's here** | The people in the room (TV and phone) | Who's watching, profiles, viewers |
| **person / people** | Household members | profile, user, member, someone |
| **event** | A calendar entry | appointment, item, plan |
| **message** | Text sent from a phone to the TV | post, note, toast |
| **code** | The pairing code | PIN, room code, token |

### Do and don't (real strings)

| Don't (current) | Do | Rule |
|---|---|---|
| "Pick everyone in the room. Select again to remove someone." (TV, Who's here) | "Select each person in the room. Select again to remove a person." | 4, terms |
| "Select to switch" (TV, Who's here tile) | "Select to change who is here" | 4 |
| "Select for picks made for who's here" (TV, Tonight) | "Select to see picks for the people here" | 2, 4 |
| "The room guesses on the TV." (TV, Sketch it) | "Everyone guesses on the TV." | 5 |
| "Nothing coming up." (TV and phone, calendar) | "No events." | 5, terms |
| "Calendar offline." / "Devices offline." (TV) | "Calendar is offline." / "Devices are offline." | 7 |
| "Weather loading…" (TV) | "Getting weather…" | 3 |
| "Dentist Tmrw" (TV, greeting subline) | "Dentist tomorrow" | 6 |
| "Simulated devices. Phones can flip them too." (TV, Home sheet) | "These devices are not real. Phones can change them too." | 4, 5 |
| "Offline: changes will not reach the server." (TV, Home sheet) | "The TV is offline. Your changes are not saved." | 3, 11 |
| "Code refreshes in 9:32" (TV, Connect sheet) | "New code in 9:32" | 1 |
| "Done, close" (TV, accessibility label) | "Done" | 9 |
| "Couldn't join" (phone) | "Cannot connect to the TV" | 11, terms |
| "That code expired" (phone) | "The code expired" | 11 |
| "Still trying. Is your phone on the same Wi-Fi as the TV?" (phone) | "Still trying. Use the same Wi-Fi on your phone and TV." | 8 |
| "On the TV, open Huddle and choose "Connect phone". Point your camera at the QR code." (phone) | "On the TV, open Huddle and select Connect phone. Scan the code with your camera." | 4, terms |
| "Who's watching" (phone heading) | "Who's here" | terms |
| "Tap to add or remove. The TV updates right away." (phone) | "Tap a person to add or remove them. The TV changes immediately." | 2, 5 |
| "Someone has to be watching." (phone hint) | "Select at least one person." | 8, terms |
| "+ Add" (phone, calendar) | "Add event" | 9 |
| "Who's it for? Nobody picked means the whole family." (phone, add event) | "Who is it for? If you select no one, the event is for everyone." | 4, 5 |
| "Simulated devices. The TV shows changes right away." (phone, Home) | "These devices are not real. The TV shows changes immediately." | 5 |
| "Ask the AI · coming soon" (phone) | "Ask the AI · Not ready yet" | 5 |

Already good, keep: "Connect phone", "Connect your phone", "Getting a code…", "Select to start", "Draw on your phone.", "Add events from your phone", "Here" / "Not here", "Send", "Sent to the TV ✓", "Cancel", "Turn on" / "Turn off", "Lock" / "Unlock", "Cooler" / "Warmer", "Rafi sent a message".

### Strings to change (for the design pass)
Done in the design pass (Oct 16). Kept as a record; new strings follow the rules above.

- `apps/tv/src/screens/WhoHereScreen.tsx`: subline (row 1 above).
- `apps/tv/src/screens/HomeScreen.tsx`: tile hints "Select to switch" and "Select for picks made for who's here"; "The room guesses on the TV."; "Weather loading…"; "Nothing coming up."; "Calendar offline."; "Devices offline."; subline "phones offline" → "Phones are offline"; "connect a phone to send messages" → "Connect a phone to send messages"; accessibility label "Connect a phone" → "Connect phone" (match the chip).
- `packages/shared/src/widgets.ts`: `eventWhen` returns "Tmrw" → "Tomorrow".
- `apps/tv/src/components/SmartHomeOverlay.tsx`: both sublines; accessibility label "Done, close".
- `apps/tv/src/components/ConnectOverlay.tsx`: "Code refreshes in …"; the raw connection `status` shown as text (show "Connecting…" / "Offline"); "Done, close"; hide "On the Mac: npm run dev:server" outside dev builds.
- `apps/companion/src/App.tsx`: empty/error states (Scan, That code expired, Couldn't join, Still trying); "Who's watching"; "Tap to add or remove…"; "Someone has to be watching."; "coming soon".
- `apps/companion/src/Widgets.tsx`: "+ Add"; "Nothing coming up."; "Who's it for? Nobody picked…"; "Simulated devices. The TV shows changes right away."

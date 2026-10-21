# Personalization onboarding (plan)

Status: **proposal, Oct 16.** Not in the locked scope yet. Decide after Sketch it (step 5) is green, or ship the [minimal slice](#minimal-slice-for-the-hackathon) only.

## Why
Today Huddle knows a person's **name and color** and nothing else. Tonight picks and the AI chat get only names (`Person = {id, name}` in `apps/server/src/ai/types.ts`), so "picks for Rafi & Nanu" can't really be *for* them. The household is also hard-coded (`demoHousehold()`, "The Khans"). Onboarding fixes both:

1. A new household sets itself up **from a phone**, with no typing on the TV.
2. Each person adds a few tastes, so Bedrock has something to personalize from.

This backs the pitch line "it knows who's on the couch" and the judges' example *"AI-enhanced viewing that adapts to household patterns"*.

## Principles
- **The phone does the input; the TV shows progress.** The TV shows a QR code, the people as they're added, and a "Ready" state. Never a form.
- **Under 2 minutes for the first person, under 30 s for each extra person.** Every step can be skipped. Defaults are good enough.
- **Taps, not typing.** Names are the only free text. Tastes are chips and quick yes/no on posters.
- **One person per phone, others can be added for them.** A parent adds the kids, and a kid's phone can claim their own person later.
- **Kid-safe by default** for anyone marked as a child. Picks respect the strictest person in the room.
- Copy follows the [UI copy standard](../design/design-guide.md#ui-copy-standard) (Simplified Technical English).

## Flow

### First run on the TV
1. TV opens with no household → **"Set up Huddle"** screen: QR code + "Scan the code with your phone camera." (Same pairing as today: `pair:request` → `pair:code`.)
2. As the phone moves through the steps, the TV mirrors them: the household name appears, then avatars pop in one by one.
3. When the phone taps **Done**, the TV goes to **Who's here** with the new people.

### On the phone (the person setting up)
| Step | Screen | Input | Skip gives |
|---|---|---|---|
| 1 | **Name your home** | Text ("The Khans") + city for weather (chips for detected city) | "Our home", server default city |
| 2 | **Add people** | Name, color (6 swatches), age band chips: *Child · Teen · Adult* | At least one person is required |
| 3 | **What do you watch?** (per person, can do later) | Genre chips (pick up to 5) + "Not for me" chips | No preference |
| 4 | **Quick picks** (per person, optional) | 8 posters, tap 👍 / 👎 / skip | Nothing |
| 5 | **Your services** | Logos: Prime Video, Netflix, YouTube, Disney+, Crave, Spotify… | All shown, none preferred |
| 6 | **Done** | "The TV is ready." | |

Steps 3–4 repeat per person. Each person also gets **"Set up on your own phone"**, which makes a QR code that opens straight to their steps 3–4 and binds that phone to them (backlog: *per-profile phone sign-in*).

### Later
- **Phone › Me**: edit tastes, re-run quick picks, change color.
- **Feedback from use**: 👍 / 👎 on a Tonight pick (phone) adds to that person's likes and dislikes. This is the "learns over time" story, and it's cheap: a list append plus a prompt change.

## Data

Additions to `packages/shared/src/protocol.ts` (all optional, so old clients keep working):

```ts
export type AgeBand = 'child' | 'teen' | 'adult';

export interface Taste {
  genres: string[];        // from a fixed list, e.g. 'comedy', 'animation', 'thriller'
  avoid: string[];         // genres or tags, e.g. 'horror', 'gore'
  liked: string[];         // titles: quick picks + 👍 on Tonight
  disliked: string[];
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  ageBand?: AgeBand;       // new
  taste?: Taste;           // new
}

// HouseholdSnapshot gains:
//   place?: {name: string; lat: number; lon: number};
//   services?: string[];  // 'prime-video', 'netflix', …
//   setupComplete?: boolean;
```

New client messages (phone only, validated in `validate.ts` like the others):

| Message | Payload | Server does |
|---|---|---|
| `household:setup` | `{name, place?}` | Sets name and place, broadcasts `household:state` |
| `profile:upsert` | `{id?, name, color, ageBand?}` | Adds or edits a person, broadcasts `household:state` |
| `profile:remove` | `{id}` | Removes a person (not the last one) |
| `taste:set` | `{profileId, taste}` | Replaces that person's taste |
| `taste:feedback` | `{profileId, title, liked}` | Appends to liked/disliked (dedup, cap 50) |
| `services:set` | `{services}` | Sets services |
| `setup:complete` | `{}` | Flips `setupComplete`; the TV leaves the setup screen |

The server keeps all of this in the snapshot (in memory; a restart clears it). The TV needs no new messages; it reads `household:state`.

## How the AI uses it
`Person` in `apps/server/src/ai/types.ts` grows to `{id, name, ageBand?, taste?}`. In `bedrock.ts`:

- **Tonight**: one line per person: *"Rafi (teen): likes comedy, animation; liked Paddington 2; avoid horror."* Add the household's services: *"Prefer titles on Prime Video or Netflix."* Add a hard rule when a child is present: *"A child is in the room: family-friendly only (G/PG, TV-Y7)."*
- **Chat**: the same people lines, so "what should I watch?" uses the asker's taste.
- **Mock AI**: pick from a small tagged catalog by matching genres, so the demo without Bedrock still visibly changes when tastes change.
- Keep the prompt short: cap 5 genres and the 10 most recent likes per person.

## Screens to design
- TV: **Set up Huddle** (QR + checklist mirroring the phone), **Ready** state. Reuse `Sheet`, `Avatar`, focus ring from `ui.tsx`.
- Phone: the 6 steps above + **Me**. Chips and poster grid follow the phone's existing card styles.
- Wireframes go in `docs/design/wireframes.html` next to *1 · Pair (first run)*.

## Minimal slice (for the hackathon)
If time is short, ship only what the demo can show in 20 seconds:

1. `ageBand` + `taste.genres` on Profile; `taste:set` message; phone **Me** card with genre chips.
2. Tonight prompt + mock catalog use them; a child present forces family-friendly.
3. 👍 / 👎 on Tonight picks (phone) → `taste:feedback`.

Demo beat: *Nanu (child) joins Who's here → Tonight picks change to family titles.* Estimate: ~1 day including tests.

Leave the full first-run flow (steps 1–2, services, own-phone QR) for after submission.

## Tests
- Shared: validators for each new message (bad shapes rejected, caps applied).
- Server: setup messages update and broadcast the snapshot; the last person can't be removed; feedback dedups and caps; prompt text includes tastes and the child rule (snapshot-test the prompt builder); mock picks change with genres.
- TV (Jest): no-household → Set up screen; `setup:complete` → Who's here.
- Phone: one happy path through the steps on a phone-sized browser.

## Open questions
- Fixed genre list: which 12? (Proposal: action, adventure, animation, comedy, documentary, drama, family, fantasy, horror, music, sci-fi, thriller.)
- Quick-pick posters: static list per age band, or ask Bedrock? Static is safer for the demo.
- Privacy line for judges: tastes live only in the household record, never shared across households.
- Does Guest get tastes? Proposal: no, Guest is neutral and never stored.

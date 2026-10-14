# Docs

| I want to… | Open |
|---|---|
| Understand what we're building and why | [product/PRD.md](product/PRD.md) |
| See / update the plan and dates | [product/roadmap.md](product/roadmap.md) |
| Park an idea for later | [product/ideas-backlog.md](product/ideas-backlog.md) |
| See how it works technically | [architecture/architecture.md](architecture/architecture.md) |
| Design screens | [design/design-guide.md](design/design-guide.md) · [design/wireframes.html](design/wireframes.html) |
| Find docs, samples, links | [research/references.md](research/references.md) · [research/echo-show.md](research/echo-show.md) (Echo Show as a second screen) |
| See the app as it runs | [screenshots/](screenshots/) (one folder per step, from the Vega Virtual Device) |
| Prepare the submission | [submission/checklist.md](submission/checklist.md) · [demo-script.md](submission/demo-script.md) |
| Log tool pain (+10% bonus) | [submission/friction-log.md](submission/friction-log.md) |
| Write required tool feedback | [submission/product-feedback.md](submission/product-feedback.md) |

**How to iterate:** edit any file directly, or ask Claude ("move ambient mode to MVP", "add a chores widget to the PRD"). Everything is in git, so you can see what changed and undo it.

## Next session: design, planning, research

**Research (~1h)**
- [ ] Skim `reference/vega-tv-interfaces-sample` and `reference/react-native-multi-tv-app-sample` (run `scripts/fetch-references.sh` first): note focus patterns and layouts to reuse
- [ ] Collect 10–15 inspiration screenshots (Google TV, Apple TV, Echo Show, Nest Hub ambient, Skylight calendar) → [design-guide § Inspiration](design/design-guide.md#inspiration)
- [ ] Look at what's on the [Fire TV Appstore](https://www.amazon.com/Fire-TV-Apps-All-Models/b/?node=10208590011) in "home / lifestyle / family" to confirm nothing already does this

**Planning (~30m)**
- [x] Re-read the [PRD](product/PRD.md). Cut or add, and lock the MVP list (Oct 14)
- [ ] Answer the open questions in [design-guide](design/design-guide.md#open-design-questions)
- [ ] Adjust dates in the [roadmap](product/roadmap.md)

**Design (rest of the day)**
- [ ] Figma file in the `Saf` or `Laurier` team, 1920×1080 frames with a 5% safe-area guide
- [x] Tokens first: colour, type scale (≥28px body), spacing, focus style (`packages/shared/src/theme.ts`)
- [ ] Hero frames: Home, Who's here, Tonight picks, Ambient. Then phone quick actions
- [ ] Share the Figma link with Claude to start the TV app shell

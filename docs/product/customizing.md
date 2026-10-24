# What is real, and how to change it (Oct 23)

Honest state of each feature, and the one place to edit it. Nothing here changes the UI.

## Real, simulated, not built
| Feature | State | Notes |
|---|---|---|
| Tonight picks | **Real**: Amazon Bedrock (Nova Lite) with a mock fallback | Titles come from the model; availability on a service is **not** checked (no watch-provider data) |
| Movie posters | **Optional.** TMDB `/search/movie` when `TMDB_API_KEY` (v3) or `TMDB_READ_TOKEN` (v4) is set. Cached in memory. Mock picks get posters too | No key, no match (common for series), or a failed lookup leaves the mood-coloured title card. Not a watch-provider check |
| Bedtime-aware picks | **Real** | Rule-based (below), applied after the model answers. Picks that run past the limit are dropped |
| Moods | **Real**, three fixed moods: Cozy, Funny, Edge-of-seat | Same list on TV and phone |
| Secret veto | **Real** | Ballots stay on the server |
| Our Week quiz | **Real**, no AI | Built from calendar, messages, weather, devices |
| Watched It quiz | **Real**: Nova Pro writes, a second pass checks | Can still get a fact wrong; mock bank is the fallback |
| Sketch the pick | **Real** | Prompts are tonight's picks |
| Family league | **Real, in memory** | Resets on server restart |
| Ring camera | **Simulated.** The phone's *Ring* button sends `door:simulate`; the TV shows a card (title, "Front door", time) | No Ring API, no snapshot. `source: 'demo'` |
| Smart home | **Simulated** (lamp, thermostat, front door lock) | |
| Personalization onboarding quiz (tastes, services, ages) | **Not built.** A proposal: [onboarding-plan.md](onboarding-plan.md) | Today the AI gets names and a kid flag only, not tastes |
| Polly, Transcribe, DynamoDB, S3 | **Not used** | |

## Where to change things
| I want to… | Edit |
|---|---|
| Change the moods or add one | `TONIGHT_MOODS` in `packages/shared/src/protocol.ts`; add the mood to `moods` on catalog entries in `apps/server/src/ai/mock.ts`; the Bedrock prompt reads the label (`apps/server/src/ai/bedrock.ts`, `tonightPrompt`). TV and phone read the list, so they follow |
| Change bedtime rules | Constants at the top of `apps/server/src/tonight/bedtime.ts`: `KID_BEDTIME` (8:30 pm, an hour later before a weekend day), `EARLY_HOUR` (a tomorrow event before 9:00 sets an early limit), `EARLY_GAP_MS` (10.5 h before it), `WINDOW_MS` (only plan within 6 h of the limit) |
| Mark someone as a child | `kid: true` on the profile in `apps/server/src/household.ts` |
| Change what Bedrock is told | `tonightPrompt` and `kidsLine` in `apps/server/src/ai/bedrock.ts` (ratings, runtime, JSON shape). Models: `HUDDLE_TONIGHT_MODEL`, `HUDDLE_CHAT_MODEL`, `HUDDLE_QUIZ_MODEL` in `apps/server/.env.example` |
| Change the offline picks | `CATALOG` in `apps/server/src/ai/mock.ts` (title, minutes, moods, one-line reason). Keep `minutes` right: bedtime filtering uses it |
| Change poster lookup | `apps/server/src/posters/tmdb.ts`. The hub calls it after the picks are chosen (`apps/server/src/hub.ts`). The TV draws `posterUrl` in `apps/tv/src/screens/HomeScreen.tsx` |
| Change quiz questions | Our Week: `apps/server/src/quiz/ourWeek.ts`. Watched It fallback bank: `MOVIE_TRIVIA` in `apps/server/src/quiz/watchedIt.ts`. Number of rounds: `QUIZ_ROUNDS` in the protocol |
| Change the family or the demo calendar | `demoHousehold` and `demoEvents` in `apps/server/src/household.ts` |
| Change vote or round timers | The engines: `apps/server/src/tonight/vote.ts`, `quiz/engine.ts`, `sketch/engine.ts` |
| Make Ring look real | Today only the TV card (`apps/tv/src/components/DoorAlert.tsx`) and the `door:event` message (`packages/shared/src/protocol.ts`, `snapshotUrl` is already a field). A real feed needs a Ring API source in the hub that sends `door:event` with `source: 'ring'` |
| Add per-person tastes | Follow the [minimal slice](onboarding-plan.md#minimal-slice-for-the-hackathon): add `tastes` to `Profile`, a phone card to set them, and pass them in `Person` (`apps/server/src/ai/types.ts`) so the prompt can use them |

After any server change run `npm run check`. After any TV change rebuild (`npm run build:tv && npm run tv:install`).

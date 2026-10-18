# What Amazon already does, and where Huddle can be different (Oct 16)

Follow-up to [community-research.md §7a](community-research.md#7a-biggest-finding-fire-tvs-2026-update-already-covers-part-of-huddle). Prompted by the Alexa+ Echo lineup video (Echo Show 8/11 home screen: greeting, smart-home widget, photos, calendar).

## Already covered by Amazon (don't compete head-on)

| Area | What ships | Source |
|---|---|---|
| Recommendations | Alexa+ on Fire TV, free in the US: conversational discovery by mood/actor/genre, follow-ups, an Alexa+ hub that resumes chats across devices, **scene search** in Prime Video. Uses viewing history + subscriptions | [Amazon](https://www.aboutamazon.com/news/devices/alexa-plus-fire-tv-hub-mobile-app-updates), [TechCrunch](https://techcrunch.com/2026/08/19/amazon-makes-its-ai-powered-alexa-free-on-fire-tv-no-prime-required/) |
| Phone ↔ TV | Fire TV mobile app: text/voice search, watchlist taps, "turn an article into a watchlist" | [Amazon](https://www.aboutamazon.com/news/devices/alexa-plus-fire-tv-hub-mobile-app-updates) |
| Party games | **Luna GameNight**: QR join, phones as controllers, inside Prime Video's Games tab on Fire TV. Jackbox and AirConsole also run on Fire TV | [finalboss.io](https://finalboss.io/amazon-luna-is-inside-prime-video-on-fire-tv-what-prime-members-can-actually-play), [Weekend](https://www.weekend.com/post/jackbox-on-fire-tv) |
| Recaps | Prime Video **X-Ray Recaps** (Bedrock): spoiler-free recap up to the minute *you* watched; video recaps later | [AV Club](https://www.avclub.com/prime-video-x-ray-generative-ai-recaps) |
| Home dashboard | Echo Show 8/11: resizable widgets, color-coded family calendar from several calendars, Tasks widget, smart-home widget, **Omnisense** shows a reminder to the person who walks by | [Amazon](https://www.aboutamazon.com/news/devices/getting-started-echo-show-8-11-alexa-plus-features), [Tom's Guide](https://tomsguide.com/ai/ive-been-using-alexa-for-3-months-here-are-my-5-favorite-features-and-one-im-not-a-fan-of) |
| News | Alexa+ daily briefing, licensed news partners, "What are today's headlines?" | [Amazon help](https://digprjsurvey.amazon.com/csad/help/node/TjARhWkhr2rr3SMqUp) |
| Launcher | Fire TV reorder/pin 20 apps; Alexa+ opens titles across services | [Amazon](https://www.aboutamazon.com/news/devices/new-fire-tv-upgrades-features-2026) |

**So:** a nicer launcher, a single-user "what should I watch", a generic phone-controller party game, a calendar widget and a news briefing are all things Amazon already does well. Drop the app-launch spike to a "nice if free" item.

## The gap: Amazon is built for *one person talking to one device*

Everything above is **one viewer, one voice, one profile at a time**. What none of it does:

1. **Group decisions.** No "watch together" mode; recommendations follow one profile. Nothing settles a 4-person argument.
2. **Private screens in a shared room.** Alexa is voice + one big screen, so everything is public. Phones let each person see something the others can't (a secret vote, a hidden role, their own recap).
3. **Games about *your* stuff.** GameNight and Jackbox are generic packs. Nothing turns what the family just watched, or the family's own week, into play.
4. **Memory across nights.** No household league, no "whose turn is it to pick", no family year-in-review.
5. **Multi-person viewing state.** X-Ray Recaps knows where *you* are. It doesn't know Nanu is two episodes behind Rafi.

Huddle's pitch should be: **"Alexa is for each of you. Huddle is for all of you."**

## Unique ideas

Effort uses what we have: WebSocket hub, Who's here, Tonight (Bedrock + mock), phone companion, Sketch it plumbing (step 5).

### Deciding together
| # | Idea | Why Amazon can't | Effort |
|---|---|---|---|
| 1 | **Secret veto.** Tonight shows 6 picks; each phone swipes yes/no in private; the TV reveals only the overlap. Nobody knows who vetoed. Tie → quick sudden-death round | Needs private screens + group logic | S (1 day) |
| 2 | **Fair turn.** The household remembers who chose last; "It's Nanu's turn" gives that person's taste double weight. Ends the "you always pick" fight | Needs household memory across nights | S |
| 3 | **Bedtime-aware picks.** Tonight reads the calendar: Dentist at 8 tomorrow + a child here → "ends by 9:15". Runtime filter + "start by" time on the TV | Calendar and TV live in separate products | S |
| 4 | **Spoiler shield.** Each person's progress per show (tap "I'm on ep 4" on the phone). If the room isn't level, the TV warns and offers a private catch-up recap on the behind person's phone while others grab snacks | X-Ray is single-viewer and public | M |

### Games that use your life (not a generic pack)
| # | Idea | Why it's different | Effort |
|---|---|---|---|
| 5 | **Watched It.** After a movie ends, Bedrock writes a 5-question quiz about the film you all just saw; phones buzz in; scores go to the family league | Turns passive viewing into a ritual; Luna can't know what you watched | S–M (reuses phone answer flow) |
| 6 | **Our Week trivia.** Questions from the household's own calendar and messages: "Who had soccer on Saturday?", "Who sent 'pizza night'?" | Only possible with household data | S |
| 7 | **Sketch the pick.** Sketch it, but the prompts are the Tonight candidates; the winner's guess becomes tonight's movie. The game *is* the decision | Merges game + recommendation | S on top of step 5 |
| 8 | **Hidden roles with an AI narrator.** Spyfall/Werewolf-style: each phone shows a secret role or word; the TV (Bedrock, later Polly) narrates and runs the clock | Needs private phone screens; voice-only Alexa can't | M |
| 9 | **Question of the day.** Morning: the TV home shows one question; people answer on phones during the day; reveal at dinner on the TV | Async, multi-day household game; nothing like it on Echo/Fire TV | S |
| 10 | **Live predictions league.** During a game, award show or reality TV, phones predict ("next scorer", "who's out"); points carry over the season | Persistent family league | M |

### News and learning, for a family
| # | Idea | Why it's different | Effort |
|---|---|---|---|
| 11 | **One story, three levels.** One headline, explained for a child, a teen and an adult side by side, with a "talk about it" question for dinner | Briefings read news *at* one person; this starts a family conversation | S |
| 12 | **Friday news quiz.** Five questions from the week's headlines, phones answer, household league | Makes news a shared habit | S |

### The family beyond the room
| # | Idea | Why it's different | Effort |
|---|---|---|---|
| 13 | **Remote seat.** Grandma joins family night from her phone or Echo Show (the `display` role already exists): votes in secret veto, plays Watched It, sends messages to the TV | Cross-household, cross-device; Alexa Drop In is a video call, not shared play | M |
| 14 | **Family Wrapped.** End of month/year: what you watched together, who won the most trivia, the most-vetoed genre. Shareable card | Needs household memory | S once data exists |
| 15 | **Earned pick power.** Chores checked off on the phone earn a kid "pick tokens" for Tonight or extra game minutes | Joins chores and entertainment; Echo Tasks don't reward | M |

## Recommendation for the hackathon (6 days left)

Keep the locked scope's shape, but change what the game and Tonight *are*:

1. **Tonight → Secret veto (#1) + bedtime-aware (#3).** Small, reuses Tonight, and it's the clearest "only Huddle does this" demo beat.
2. **Sketch it → Sketch the pick (#7),** or swap Sketch it for **Watched It (#5)** if drawing is slow to build. Both reuse the same phone-answer and scoring plumbing.
3. **Our Week trivia (#6)** or **Question of the day (#9)** as a cheap second game that shows household memory.
4. Demote the app-launch spike: one "Open in Prime Video" button only if `Linking` works on the first try.

Everything else stays in the backlog. A scope change goes into the PRD and roadmap when it's decided.

## Uniqueness check for step 6 (Oct 17)

Before building step 6 we checked each feature against what Fire TV and the big streaming apps ship today.

| Feature | Already out there? | What keeps ours different |
|---|---|---|
| Secret veto | Not on Fire TV, Alexa+, Netflix or Prime Video: Alexa+ recommends for one person ([TechRepublic](https://techrepublic.com/article/news-alexa-plus-fire-tv-free/)). Third-party phone apps do swipe-to-match ([Stream Vote](https://apps.apple.com/eg/app/app/id1560203643), [Chooza](https://apps.apple.com/au/app/chooza/id6469320507), [WatchPick](https://peerpush.com/p/watchpick)) | No install (QR). Voters are the people on the TV's Who's here. The TV, the shared screen, shows who has voted and only the overlap. The picks already fit bedtime. No overlap → sudden death on the TV, not a dead end |
| Bedtime-aware picks | Nothing found. Alexa+ uses viewing history and subscriptions, not the family calendar or who is in the room | Reads the family calendar and the kids present, shows "Ends by 8:30 · Rafi's bedtime", drops titles that run long |
| Sketch the pick | Drawing party games exist on Fire TV (Luna GameNight, Jackbox Drawful) | Only the hook is new: the prompts are tonight's candidates and the game sets tonight's pick. **Risk:** in a demo it can read as "Pictionary on phones". Show it right after the veto, as another way to decide, and keep the quiz about *your* week as the lead game |

Rule for the demo and the submission text: never show a feature on its own if a single-viewer product already does it. Lead each beat with the group (private phones, a shared reveal, the family's own data).

# Is each feature unique? (Oct 18)

Honest scoring of every shipped feature. Extends [differentiation.md](differentiation.md), which covered Amazon's own products and steps 5–6. This file covers all of Huddle.

**How sure are we:** the Oct 16–17 research looked at Amazon, Netflix, Prime Video and Luna. On Oct 18 we added four short web searches (household-data trivia, group voting for TV, multi-person family home screens, bedtime-aware picks). That is a quick check, not a patent search. "Nothing found" means we did not find it, not that it does not exist. Re-check anything you plan to call "first" in the submission.

Verdicts: **Unique** (nothing found), **Differentiated** (exists elsewhere, ours differs in a way a judge can see), **Common** (table stakes; do not pitch it as new).

| Feature | Verdict | Already out there | What is ours |
|---|---|---|---|
| Clock, weather, family calendar widgets | Common | Echo Show 8/11 widgets, Skylight Calendar, Google TV ambient mode | It runs on Fire TV, and the calendar rows name the people in the room. Do not lead with it |
| Simulated smart-home tile (lamp, thermostat, door) | Common | Alexa smart-home widget on Echo Show and Fire TV | Nothing. It is simulated; the value is the phone-to-TV round trip |
| Demo doorbell alert | Common | Ring on Fire TV; Office Hours called a Ring feed "obvious" | Nothing. Keep it to one second in the video |
| QR pairing, no app install | Common | Luna GameNight, Jackbox, AirConsole | A household stays paired; the phone picks who it is. Nothing new in the join itself |
| Message the TV from a phone | Common | Fire TV mobile app, casting, share-to-TV | Shows the sender's name and colour on the TV |
| Who's here (several people at once) | Differentiated | Fire TV, Netflix and Apple TV profiles pick one viewer at a time | Several people at once, and the rest of the screen follows. We did not find a TV home screen that does this |
| AI chat that knows the household | Common | Alexa+ on Fire TV does conversational help | It knows who is here, the calendar, the weather and the devices. It is typed on the phone. Minor |
| Tonight: AI movie picks for the room | Common | Alexa+ discovery, Prime Video, Netflix | Only the group and bedtime parts below are new |
| **Secret veto** (private phone yes/no, TV shows only the overlap) | Differentiated | Phone apps do this: FlickPicker (anonymous votes), Stream Vote, Chooza, WatchPick. We found no TV platform feature that does | No install (QR). Voters are the people on the TV's Who's here. The TV shows who voted but never how, then only the accepted picks. No overlap goes to sudden death. Pitch it as "on the TV, with no app", not as an invention |
| **Bedtime-aware picks** ("Ends by 8:30") | Unique | Nothing found. Alexa+ uses history and subscriptions, not the family calendar or who is in the room | A kid in the room and tomorrow's early start set an "ends by" time, and picks that run past it are dropped. Small feature, clearest "only Huddle" line |
| **Our Week** quiz (questions from the family's own calendar, messages, weather) | Unique | Generic AI family trivia apps exist (Family Trivia Games & Quiz AI, TriviaMaker). Found none that build questions from a household's own data | Needs the household data, which only the home screen has. Built with no model, so answers are always right |
| **Watched It** quiz (about the movie you just picked) | Differentiated | Prime Video X-Ray Recaps is single-viewer recaps; trivia generators exist | A group quiz about tonight's pick. **Weak point:** Nova invents facts (see product feedback), so it needs the check pass and a hand-checked demo title |
| Sketch the pick | Differentiated | Drawing games: Luna GameNight, Jackbox Drawful, Sketchy AF (named at Office Hours) | Only the hook: prompts are tonight's candidates and the winner sets tonight's pick. Alone it reads as "Pictionary on phones" |
| Family league | Differentiated, thin | Every quiz app has a scoreboard for one session | Points, wins and games per person across games. Today it lives in server memory and resets on restart. See [family-league.md](../product/family-league.md) |
| `tv-focus-kit` | Differentiated, unchecked | `react-native-tvos` has focus props; Vega has `TVFocusGuideView` and Cartesian focus | A tested neighbour map with row memory for uneven widget grids, usable without React. We did not compare it with other RN TV libraries. Do that before the Open Source write-up |

## What this means for the pitch
- **Lead with the group.** Everything Amazon ships serves one viewer. The strongest beats are bedtime-aware picks, the secret veto on the TV, and Our Week.
- **Do not claim a first** for the veto, Sketch the pick, or the widgets. Say "no install" and "on the shared screen".
- **Put the table-stakes rows in one breath.** Widgets, smart home and the doorbell are context, not the reason to win.
- **Two weak spots a judge could find:** Watched It facts, and a league that forgets everything on restart.

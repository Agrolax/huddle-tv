# Ideas backlog

Parked ideas. Phases 1–4 live in the [PRD](PRD.md). Move something else in only when phase 2 is green.

## Huddle Games (now phase 4)
AI-hosted party trivia, plus a folder other people can drop a game into. See the PRD. Screens and the phone buttons are already in [wireframes-games.html](../design/wireframes-games.html).
- Event protocol, when we build it: `room:create`, `player:join`, `game:configure`, `question:show`, `answer:submit`, `question:reveal`, `leaderboard:show`, `game:end`
- Contributor contract: `games/<id>/manifest.json` with `id`, `title`, `minPlayers`, `maxPlayers`

## Other ideas
- **Differentiation list (Oct 16)**: 15 ideas Amazon's own stack can't do (secret veto, spoiler shield, Watched It trivia, Sketch the pick, remote seat…) in [differentiation.md](../research/differentiation.md)
- **Ring tile**: doorbell event → TV overlay "Someone's at the door" with snapshot (Ring API / simulator). *Simulator done in the design pass (Oct 16); `DoorEvent.snapshotUrl` / `source: 'ring'` wait for a real Ring webhook*
- **MCP server for Huddle**: tools like `post_to_board`, `add_event`, `whats_on_tonight`, so external agents (Claude, Alexa+-style assistants) can act on the household
- **Chore rotation** widget with streaks for kids
- **Cooking timer** widget, controllable from phone
- **Watch party mode**: everyone votes on Tonight picks from their phones
- **Bee integration**: meeting/convo notes → "family reminders" on the board (Bee track, cross-device)
- **Care mode**: simplified UI + medication reminders for grandparents (accessibility angle)
- **Kids mode**: time limits, only approved apps in the row

## Phone ↔ TV connection ideas
Already in the architecture: QR/6-char pairing, one WebSocket channel per household, phone as keyboard + camera (notes, NL events, photos, hold-to-talk via Transcribe). These extend it. Ordered by value for the demo; the first three are the ones to consider for phase 2.

**Likely for phase 2 (web companion, no native app)**
- **Phone as D-pad remote + keyboard**: companion has a touchpad/arrow view that sends key events over the WebSocket. Doubles as the fallback if the judge has no remote, and text entry stays on the phone (TV has no text input).
- **Share-to-TV**: phone sends a link, photo, recipe or YouTube URL to the household and it appears as a toast or Board card on the TV. Web Share Target (PWA manifest) makes Huddle show up in the Android share sheet. iOS Safari does not support it, so iOS needs a paste box or a "send to TV" button instead.
- **Tonight voting from phones**: TV shows the AI picks, everyone taps a vote on their phone, TV animates the winner and launches it. Extends the Watch party idea above. Strong 20-second demo moment.
- **Phone-built watchlist**: add a title or paste a link on the phone and it enters the Tonight candidate pool, tagged with the profile that added it.
- **Remote service setup**: the phone picks which streaming services the household has (Vega has no PackageManager scan), so the TV app row builds itself with no TV-side typing.
- **Per-profile phone sign-in**: scanning the QR and tapping a profile binds that phone to that profile. Profile switching on the TV can then follow whose phone pressed "I'm watching".

**Nice touches**
- **TV → phone nudges**: "Dinner's ready", "Chores done", "Tonight is decided" pushed from the TV or server to phones. Start with in-page toasts, add web push later.
- **Presence**: who is in the room, from "I'm here" taps (cheap) or phone join events (also cheap). Real presence (Wi-Fi/Bluetooth/geofence) is not possible from a web page, so skip it.
- **Guest join**: short-lived code so a visitor's phone can post to the Board or vote without joining the household. Expires at end of night.
- **Phone camera → Board**: snap a photo or whiteboard note and Rekognition/Nova turns it into a Board card.
- **Remote volume/mute/pause**: needs Media Controls on the Vega side. Only worth it if the spike shows it works.
- **Alexa/Echo as another phone**: Echo is a voice client hitting the same API (`whats_on_tonight`, `post_to_board`), see the MCP idea above.

**Stretch (needs a native phone app)**
- **Matter Casting**: Vega apps can declare a Matter identity and provide Content Launcher, Media Controls and Account Login clusters, so a phone can launch content and control playback on the TV through the platform rather than our server. The Matter casting SDKs are native iOS/Android, so this does not fit the web companion. Park it unless the web path is done and we want a "works with Amazon's own casting" line in the writeup. Check the `vega-matter-casting` skill and docs before committing.

**Risks to check in the spikes**
- If a public host is added later, the TV and the phone both have to reach that host. Make the phone's QR link use it, not `localhost`. Nothing is hosted today.
- Reconnect handling: TV sleeps, phone backgrounds. WebSocket needs resume-with-last-event-id so the Board does not go stale.
- Judges may not have a phone handy: keep a "phone view in a browser tab" path and a mock mode.

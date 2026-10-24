# Screen and state inventory

Written Oct 21 from `apps/tv/src` and `apps/companion/src`. This is the redesign checklist. No screen was changed to produce it.

The TV has two screens (`who`, `home` in `App.tsx`) plus sheets and two overlays that never take focus. The phone is one page (`App.tsx`). There is no router. A card changes shape in place.

Screenshot paths are files already in `docs/screenshots/`. They are matched by filename. This pass did not re-open every image, and it did not run the Vega Virtual Device.

Household state comes from the server and lives in memory. A restart clears it. The TV then shows its local profile list until `welcome` arrives.

## TV

Sheets use `Sheet` (`components/ui.tsx`): the page dims, focus is trapped, Back closes. Focus returns to the control that opened the sheet. Back on Home goes to Who's here. Back on Who's here exits the app. A sheet's Back handler is registered after the screen's, so the sheet gets Back first.

A phone that starts a live game opens the Game night sheet on the TV, unless Connect, Tonight or Home is already open. It opens when that sheet closes.

| Screen | Route / component | Loading | Empty | Error | Focus / Back | Screenshot |
|---|---|---|---|---|---|---|
| Who's here? | `App` screen `who` · `screens/WhoHereScreen.tsx` | None of its own. Local profiles (`data/profiles.ts`) until `welcome` replaces them | No empty state. Zero people selected still continues; the id sent is `guest` | None on screen | First avatar has preferred focus. Select toggles. Continue is below the row. Back exits the app | `docs/screenshots/step-1/01-who-focus-rafi.png`, `design-pass/01-whos-here.png`, `step-3/00-who.png` |
| Home | `App` screen `home` · `screens/HomeScreen.tsx` | Weather line is blank until the first Open-Meteo reading. Tonight tile shows the three mood names, each on a mood colour, until picks exist. A pick with `posterUrl` shows that image and the title on a scrim; otherwise the title sits on the mood colour | Calendar: "No events." Game tile: "Play a quiz on your phones." until a game or a league leader | Socket not `open`: an "Offline" pill in the header. Calendar and Home tiles say "Offline" when they have nothing to show | Grid starts on the clock. Connect phone is in the header. Select on Who's here leaves for that screen. Select on clock or calendar does nothing. Back goes to Who's here. Poster images are not focusable | `docs/screenshots/design-pass/02-home.png`, `step-6/01-home-ends-by.png`, `step-6/09-home-pick.png` |
| Connect phone | `components/ConnectOverlay.tsx`, opened from the header chip | "Getting a code…" and a dotted code until `pair:code` | No phones listed until one joins. The joined line is "Connected: …" | Not `open`: "The TV cannot connect to the Huddle server", the URL, and "Connecting…" or "Offline". In dev, a line to run `npm run dev:server` | Trapped. Done is preferred. Back or Done returns focus to Connect phone. The code refreshes 30 s before it expires | `docs/screenshots/step-2/02-connect-overlay.png`, `step-2/03-connect-overlay-phone-joined.png`, `design-pass/05-connect-sheet.png` |
| Tonight picks | `components/TonightOverlay.tsx` `PicksView` | "Getting picks…" while `tonightLoading`. Asks once on open if the room has no picks | Online, no picks yet: "Select a mood." | Not `open`: "The TV is offline." Moods and Vote are disabled. A failed request clears loading (server error, or 20 s) and does not print the error. Mock source shows "Demo picks" | Trapped. Preferred mood is the current one, or Cozy. Back or Done returns to the Tonight tile. Vote needs two picks and an open socket | `docs/screenshots/step-4/02-tonight-sheet.png`, `step-4/03-tonight-edge-of-seat.png`, `step-6/02-tonight-sheet.png`, `design-pass/03-tonight-sheet.png` |
| Secret vote, in progress | `TonightOverlay` `VoteView`, phase `voting` or `sudden-death` | Timer from `vote.endsAt` | "Connect a phone to vote." when no phone has a person | Same sheet; no separate error line. Ballots are never shown | Trapped. Show result is preferred. Stop vote ends it. Back closes the whole Tonight sheet | `docs/screenshots/step-6/03-vote-progress.png`, `step-6/04-sudden-death.png` |
| Secret vote, result | `VoteView`, phase `result` | None | "Nobody voted." | None | Done is preferred. Vote again starts another round. Back closes the sheet | `docs/screenshots/step-6/05-vote-result.png` |
| Game night menu and final | `components/GameNightOverlay.tsx` when phase is `idle` or `final` | None | League: "Play a quiz to start the league." | Not `open`: "The TV is offline." Start buttons disabled. Sketch stays disabled until two phones with a person are connected, and the hint says so | Trapped. Our Week is preferred. Done closes and returns to the Game night tile. Back does the same | `docs/screenshots/step-5/01-menu.png`, `step-5/04-final.png`, `step-6/08-sketch-final.png` |
| Quiz or Sketch loading | `GameNightOverlay`, phase `loading` | Subtitle is always "Writing questions…". The title is the game's (`Watched It: …` or `Sketch the pick`). Sketch sends this once, then the drawing round | No question and no board yet | End game is the only action | Trapped. End game is preferred. Back closes the sheet | None. The VVD shots start at the question or the board |
| Quiz question | `QuestionView`, phase `question` | Countdown from `endsAt` | "Answer on your phone." when nobody has answered | Watched It mock shows "Demo questions" in the footer. The TV never shows the answer in this phase | Trapped. Show answer is preferred. The remote does not pick A–D. Back closes the sheet | `docs/screenshots/step-5/02-question.png` |
| Quiz reveal | `QuestionView`, phase `reveal` | None | "Nobody answered." | None. The right choice is labeled "Right answer" | Trapped. Next question or See scores is preferred (primary) | `docs/screenshots/step-5/03-reveal.png` |
| Sketch the pick, drawing | `SketchView` inside `GameNightOverlay`, kind `sketch`, phase `question` | Countdown. The board is `SketchBoard` | "Guess on your phone." when there are no guesses. Hint is the letter slots | None on the sheet. The title is only on the drawer's phone | Trapped. Show answer is preferred. Back closes the sheet. Strokes are not focusable | `docs/screenshots/step-6/06-sketch-drawing.png`, `step-6/10-phone-drawing-on-tv.png` |
| Sketch the pick, reveal | `SketchView`, phase `reveal` | None | "Nobody got it." | The answer title is on the TV in this phase | Trapped. Next round or See scores is preferred | `docs/screenshots/step-6/07-sketch-reveal.png` |
| Message toast | `components/MessageToast.tsx`, mounted from `App` on both screens | Fade in 220 ms | Hidden when there is no message | None | Not focusable (`pointerEvents="none"`). 8 s, then fades. Bottom right. Does not change the greeting | `docs/screenshots/step-2/06-tv-message-toast.png`. `step-2/07-tv-subline-after-toast.png` is an older shot: Home no longer has a greeting subline |
| Door alert | `components/DoorAlert.tsx`, mounted from `App` | Fade in 220 ms | Hidden until a `door:event`. A snapshot image only if `snapshotUrl` is set (the demo Ring button does not send one) | None | Not focusable. 15 s, bottom left | `docs/screenshots/design-pass/06-door-alert.png` |
| Home devices | `components/SmartHomeOverlay.tsx` | None | Done is preferred only when the device list is empty (the tile says Offline before the snapshot) | Subtitle when not `open`: "The TV is offline. Your changes are not saved." Sends still go out; the tile updates when the server echoes | Trapped. First device control is preferred. Back or Done returns to the Home tile | `docs/screenshots/step-3/02-smart-home-sheet.png`, `step-3/03-sheet-lamp-off.png`, `design-pass/04-smart-home-sheet.png` |

## Phone

Touch only. No D-pad focus and no Back handler. The browser's back leaves the page. While a snapshot exists and the socket drops, the page stays up and the pill says "Reconnecting…". Controls with `disabled` are off until status is `open`.

A server `error` frame is stored on `useHuddle` state and is not drawn on the cards. That includes "Sketch the pick needs two phones." Only `status === 'failed'` replaces the page. The TV is the one that disables Sketch until two phones are connected.

| Screen | Route / component | Loading | Empty | Error | Focus / Back | Screenshot |
|---|---|---|---|---|---|---|
| Scan to join | `App.tsx` when status is `unpaired` (`useHuddle` has no `?h=` / `?c=` and no saved session) | None | The whole page: "Scan the code on your TV" | None | Touch. No focus trap | None. The phone shots start after join |
| Connecting | `App.tsx` when there is no snapshot yet | "Connecting to your TV…". If already reconnecting: "Still trying. Use the same Wi-Fi on your phone and TV." | The whole page | None yet | Touch | None |
| Cannot connect | `App.tsx` when status is `failed` | None | The whole page | "The code expired" for `pair-code-expired`, otherwise "Cannot connect to the TV", plus the server message | Touch. The copy says to scan a new code | None |
| Phone home | `App.tsx` once a snapshot exists. Cards in order: who you are, vote (only while a vote is on), game (moves to the top while live), who's here, message, chat, Tonight, calendar, Home | Header pill "Connected to the TV" or "Reconnecting…". Weather line omitted until a reading | Each card has its own empty state below | The pill is the only connection error on this page. Server errors are not shown | Touch. One scrolling page | `docs/screenshots/step-2/phone-02-home.png`, `step-3/phone-calendar-home.jpg` |
| Who are you? | `WhoAmI` in `App.tsx` | None | The picker, until a name is chosen. Later it collapses to "You're {name}" with Change | None | Touch | `docs/screenshots/step-2/phone-01-joined-who-are-you.png` |
| Who's here | `WhoIsWatching` in `App.tsx` | None | Hint "Select at least one person." if the last person is tapped off. The change is not sent | None | Touch. The TV updates on each accepted tap | `docs/screenshots/step-2/phone-03-switched-profiles.png` |
| Send a message | `SendMessage` in `App.tsx` | None | Placeholder "Pizza night 🍕" | Over 280 characters: the counter turns to an error and Send is disabled | Touch. "Sent to the TV ✓" for 2.5 s after the echo | `docs/screenshots/step-2/phone-04-typing-message.png`, `step-2/phone-05-sent.png` |
| Ask the AI | `AI.tsx` `ChatCard` | "Thinking…" after the question, then a caret on the streaming answer | Three suggestion chips and a one-line description until the first turn | Over the character cap: a small error count. A server chat error is not drawn; streaming stops | Touch. New chat shows once there are lines, and is off while streaming | `docs/screenshots/step-4/phone-chat.jpg` |
| Tonight | `AI.tsx` `TonightCard` | Button label "Finding picks…" | No pick list until `tonight` is set. The intro still names who's here | None on the card. Mock picks add "demo picks". Vote is hidden while a vote is already on, or when there are fewer than two picks | Touch | `docs/screenshots/step-4/phone-tonight.jpg` |
| Secret veto, yes / no | `Vote.tsx` `VoteCard`, phase `voting` | None. One pick at a time | "Tap your name at the top to vote." when no person is chosen | None on the card | Touch. Yes and No. Show result and Stop vote are text buttons | None in `docs/screenshots/` |
| Secret veto, sent | `VoteCard` after this phone's ballot | None | "Vote sent. Nobody sees how you voted." | None | Touch | None |
| Sudden death | `VoteCard`, phase `sudden-death` | None | Needs a chosen name, same as yes/no | None | Touch. One button per remaining pick | None |
| Secret veto, result | `VoteCard`, phase `result` | None | "Nobody voted." when there is no winner | None. Sudden death says "Decided in sudden death." Any other winner says "Everyone said yes." | Touch. Done ends the vote | None |
| Game night card | `Game.tsx` `GameCard`, idle or final | None | Short intro. League list omitted when there are no totals | None. Sketch stays tappable with one phone; the server rejects it and the phone does not show that error | Touch. Moves under Who are you? while a game is live | None for the idle card |
| Quiz loading | `GameCard`, phase `loading` | "Writing questions…" | No choices | None | Touch | None |
| Quiz answer | `GameCard`, phase `question` or `reveal` | "Answer sent. Look at the TV." after a tap | "Tap your name at the top to answer." | Reveal: "Correct. +N points." or "Not this time." Someone who did not answer sees "The answer is {letter}." | Touch. A–D lock after one tap. Show answer, Next question, End game | None. TV shots are in step 5 |
| Sketch, your turn to draw | `Sketch.tsx` `SketchPlay` when `drawerId` is you, phase `question` | Title "Draw: …" until `sketch:prompt` arrives | The pad starts blank. Clear wipes it | None on the card | Touch. Five pen colors and Clear. Strokes stream to the TV | None of the phone pad. `step-6/10-phone-drawing-on-tv.png` is the TV |
| Sketch, guessing | `SketchPlay` when someone else draws | None | Guess field. "Tap your name at the top to guess." A right guess replaces the field with "You got it." | A wrong guess stays in the list as "no" | Touch | None |
| Sketch, reveal | `SketchPlay`, phase `reveal` | None | "Nobody got it this time." for the drawer, "Not this time." for a guesser, or "+N points." | The answer is "It was {title}" | Touch. Next round or Show answer, and End game | None |

## Not a screen

These are in the tree and easy to mistake for screens:

- Clock and calendar on the TV are tiles only. Select does not open anything.
- `HouseholdContext` mentions a greeting subline. Home does not render one. The toast is the message UI.
- The phone Home card (`SmartHomeCard`) returns nothing when the device list is empty. The Ring button is on that card, not its own screen.
- The phone calendar add form is inline on the calendar card (`Widgets.tsx`), not a route. Empty list: "No events."

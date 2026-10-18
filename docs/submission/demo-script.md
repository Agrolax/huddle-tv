# Demo video script (< 3:00)

Judges may score from the video and text alone, and may stop at 3:00. So the best material goes first, and the video runs 2:55.

Shape, as Devpost asks: **problem → solution working → who it's for → how it uses the track's tools.** Problem is the first 12 s, the solution runs to 2:25, and 2:25–2:45 is "Built on Vega" (the track tool, shown on screen, not only said).

Scope is the Oct 14 lock, sharpened Oct 17 ([PRD §2](../product/PRD.md#2-pitch)). Nothing in the video shows cut items: no apps row, no photo or ambient mode, no launching into a streaming app.

Household in the demo: Rafi and Nanu on the couch, Ammu on the phone. These are the server's seed profiles.

Claims check (what the voiceover may say): Bedrock is the only AWS service the server calls. Do not say DynamoDB, S3, Polly or Lightsail. Say "open source" only once `tv-focus-kit` is public with a LICENSE (checklist › Open Source).

## Timeline

| Time | Beat | On screen | Needs |
|---|---|---|---|
| 0:00–0:12 | Problem | Couch, TV on the Fire TV home screen, someone scrolling. Cut to Huddle Home; a phone draws a cat and it appears on the TV. Title card. | step 5 |
| 0:12–0:25 | Who's here | Who's here? Pick Rafi and Nanu with the remote. Home greets them by name. Lower third: "Running on the Vega Virtual Device". | step 1 |
| 0:25–0:45 | Home, live | Slow pass over the grid: clock and Open-Meteo weather, family calendar, smart home tile. Focus ring moves with the D-pad. | step 3 |
| 0:45–1:15 | Phone joins | Connect phone → QR. Phone scans, picks Ammu. Ammu joins Who's here on the TV. Phone sends "Pizza night at 7" → toast on the TV. Phone adds "Dentist, Thu 4pm" → calendar updates. Phone turns the lamp off → smart home tile updates. | steps 2, 3 |
| 1:15–1:45 | Tonight, secret veto | Tonight tile: picks for Rafi, Nanu and Ammu with "Ends by 8:30 (Rafi's bedtime)". Corner inset: the server log printing `source: bedrock` as the picks arrive. "Vote on phones": three phones say yes/no in private, the TV shows who has voted, then reveals only the pick everyone accepted (no overlap → sudden death between the top two). | steps 4, 6 |
| 1:45–2:00 | Household quiz | *Our Week*: "Who has the dentist on Thursday?" on the TV, phones tap A–D, reveal, family league. | step 5 |
| 2:00–2:25 | Sketch the pick | TV picks Ammu to draw. Her phone shows a movie from tonight's candidates. Strokes appear live on the TV. Rafi guesses it. After the last round, the last movie drawn becomes tonight's pick on the Tonight tile. | step 6 |
| 2:25–2:45 | Built on Vega | Split screen. Left: terminal, `vega device list` (the VVD), `vega project doctor` passing, `npm run build:tv` producing the `.vpkg`. Then Claude Code answering a Vega question through the Amazon Devices Builder Tools MCP (docs search → answer with a doc name). Right: the architecture slide. Last 4 s: `tv-focus-kit` README. | none |
| 2:45–2:55 | Close | Back on Home with everyone on Who's here. Name and one-liner. | step 3 |

## Voiceover

Read slowly, about 2.5 words a second. Each line fits its beat (word count in brackets, budget = seconds × 2.5).

| Beat | Line |
|---|---|
| Problem | "Every night starts with 'what should we watch?' The Fire TV home screen is built for one viewer, not the whole family. Huddle Home fixes that." [26 / 30] |
| Who's here | "Open Huddle and say who's on the couch. The home screen is now for Rafi and Nanu." [16 / 32] |
| Home, live | "Real weather, the family calendar and the house, all on one screen. Every tile works with the remote." [18 / 50] |
| Phone joins | "Any phone joins with a QR code. No app to install. Ammu is in. She sends a message, adds the dentist to the calendar, and turns the lamp off. The TV updates live." [33 / 75] |
| Tonight, secret veto | "Amazon Bedrock picks for the people in the room, and it knows it's Rafi's bedtime at 8:30, so nothing runs long. Then everyone votes on their phone, in secret. Only the pick everyone accepts shows up." [37 / 75] |
| Household quiz | "Game night is about your family. The quiz asks about your own week." [12 / 37] |
| Sketch the pick | "Or draw the movie. One phone is the pen, the others guess, and the game ends on what we watch." [20 / 62] |
| Built on Vega | "Huddle is a React Native for Vega app, running on the Vega Virtual Device. We built it with the Amazon Devices Builder Tools: the Vega CLI and the docs MCP. The D-pad focus kit is open source." [37 / 50] |
| Close | "Huddle Home. The Fire TV home screen, rebuilt for the whole family." [11 / 25] |

If the focus kit is not public by recording day, replace the last sentence of "Built on Vega" with: "Bedrock writes the picks and the quiz."

Voiceover: a human voice is fine. If you use Polly instead, say so in the Devpost text (it then counts as an AWS service used).

## Architecture slide (20 s, shares the "Built on Vega" beat)

One 1920x1080 slide, same theme as the app. Left to right, only what exists today:

- Fire TV (Vega OS): React Native for Vega, `tv-focus-kit`
- Phones: React web companion, joined by QR
- Server: Node WebSocket hub, one household protocol for TV, phones and future displays
- AWS: Amazon Bedrock (Nova: Tonight, chat, quiz questions)

No more than 20 words of text on the slide. The voiceover carries the rest. Keep the diagram accurate: the old ASCII diagram in `architecture.md` still shows photos, Polly and DynamoDB, so do not copy from it.

## Shot list

| # | Shot | Device | What to capture | Merged first |
|---|---|---|---|---|
| 1 | Couch wide | Camera or phone on a tripod | Family on the couch, TV on the Fire TV home, then Huddle Home. 10 s, no dialogue. | 3 |
| 2 | Sketch the pick teaser | Camera | Phone in hand drawing, TV in the background showing the strokes. 5 s. | 6 |
| 3 | Who's here | VVD | Who's here? → select Rafi, Nanu → Home with the greeting | 1 |
| 4 | Home pass | VVD | D-pad across weather, calendar, smart home tiles. Weather must show live data. | 3 |
| 5 | Connect overlay | VVD | Select Connect phone, QR overlay opens | 2 |
| 6 | Scan QR | Camera, phone in hand | Phone camera on the TV QR, companion opens | 2 |
| 7 | Pick Ammu | iPhone screen recording | Join page → pick Ammu | 2 |
| 8 | Ammu on the TV | VVD | Ammu's avatar appears in Who's here | 2 |
| 9 | Message | iPhone recording + VVD | Type "Pizza night at 7", send. TV toast with sender. | 2 |
| 10 | Calendar add | iPhone recording + VVD | + Add → "Dentist", Thu 4pm, pick Nanu → TV calendar updates | 3 |
| 11 | Lamp off | iPhone recording + VVD | Smart home → Lamp off → TV tile updates | 3 |
| 12 | Tonight | VVD | Open Tonight → picks with why lines and "Ends by" | 4, 6 |
| 12b | Live Bedrock | Terminal | Server started with `HUDDLE_AI=bedrock`; log line with `source: bedrock` as Tonight returns (about a second). Crop to the log line only: no account IDs, no credentials. | 4 |
| 13 | Secret veto | Three phone recordings + VVD | Yes/no swipes on phones, TV voting progress, reveal | 6 |
| 13b | Quiz | iPhone recording + VVD | *Our Week* question, A–D tap, reveal, league | 5 |
| 14 | Sketch the pick, drawer | iPhone recording | Movie prompt, drawing it | 6 |
| 15 | Sketch the pick, TV | VVD | Strokes appearing live, guesses, score, movie set as tonight's pick | 6 |
| 16 | Sketch the pick, guesser | Second phone recording | Wrong guess, then right guess | 6 |
| 17 | Close | VVD | Home with three people on Who's here | 3 |
| 18 | Vega toolchain | Terminal | `vega device list` (VVD listed), `vega project doctor` passing, `npm run build:tv` ending with the `.vpkg` path. Pre-warm so it takes 5 s on screen, or speed-ramp the build. | 7 |
| 19 | Builder Tools MCP | Claude Code | Ask a real Vega question (for example "how do I screenshot a Vega app?" or "how do TVFocusGuideView and nextFocus work?"). Show the tool call to the docs MCP and the answer naming the doc. 8 s. Use a question you actually asked while building, not a staged one. | 7 |
| 20 | Focus kit | Browser or editor | `packages/tv-focus-kit` README top, 4 s, then back to the grid with the focus ring moving | 7 |

Shots 9–11, 13–13b and 14–16 are split screen in the edit: phone on the left, TV on the right, same moment. Record the phone and the VVD at the same time so they line up.

## Recording on macOS

**Before you record**
- Server running, VVD running the latest build from `main`, companion open on a real phone on the same Wi-Fi (README › Networking).
- Restart the server so the seed household and calendar are clean.
- Phone: Do Not Disturb on, full battery, brightness up, time set to something plain.
- Mac: hide the Dock and desktop icons, Do Not Disturb on. Close every window with account names, emails or AWS console tabs.
- The VVD clock runs in UTC ([FL-13](friction-log.md)): the clock tile will be off by the Mac's offset. Frame shots so the clock is not the subject, or note it in the cut.

**TV (Vega Virtual Device)**
- Video: Cmd+Shift+5 → Record Selected Portion → draw the box over the VVD screen only (not the title bar or the remote panel). Options → no microphone. Stop from the menu bar.
- Drive the VVD with the keyboard or the on-screen remote. Move slowly: one press, half a second, next press.
- Stills (for the slide, Devpost gallery and README): `scripts/vvd-capture.sh out.png KEY_RIGHT KEY_DOWN`. It crops to the screen and saves 1920x1080.

**Phone**
- iPhone screen recording: Control Center → Screen Recording. Tap away any notification banners before you start.
- AirDrop the recordings to the Mac.

**Phone in hand (shots 1, 2, 6)**
- Film with a second phone or camera, landscape, locked exposure. Daylight or warm room light. Keep the TV in focus when it matters (the QR, the strokes).
- If the VVD is on the Mac, mirror the Mac to the TV over HDMI so the couch shot shows the real app.

**Take tips**
- Record each shot three times. Keep the cleanest.
- Leave 2 s of still screen before and after every action, for cuts.
- Tonight and AI chat can be slow on the first call. Warm them up once before you record.
- *Watched It* on Nova Pro still gets a fact wrong now and then. Use a hand-checked title for the take, or use *Our Week* only.

## Edit and export checklist

- [ ] Cut to the timeline above. Total under 2:55, checked in the editor.
- [ ] The problem lands in the first 12 s, and "Running on the Vega Virtual Device" shows before 0:25.
- [ ] Split screen for phone + TV moments, phone on the left.
- [ ] Voiceover recorded in a quiet room, levels even, music ducked under it.
- [ ] Royalty-free music only (YouTube Audio Library or similar). Note the track and license in the Devpost text.
- [ ] Burned-in captions for every voiceover line. Large, high contrast, inside the safe area.
- [ ] No placeholder tiles, debug text, error toasts, credentials, account IDs or personal email visible in any frame (check the terminal and Claude Code shots frame by frame).
- [ ] The voiceover claims only what exists: Bedrock yes; DynamoDB, S3, Polly no.
- [ ] Export 1080p (1920x1080), H.264, 30 fps.
- [ ] Upload to YouTube as Public (the rules want it public; Unlisted may be refused). Open the link in a private window to check it plays.
- [ ] Paste the YouTube link into Devpost. Add the timestamps of each beat to the description.

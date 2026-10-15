# Demo video script (< 3:00)

Judges may score from the video and text alone, and may stop at 3:00. So the best material goes first, and the video runs 2:55.

Scope is the Oct 14 lock ([PRD §2](../product/PRD.md#2-pitch)). Nothing in the video shows cut items: no apps row, no photo or ambient mode, no launching into a streaming app.

Household in the demo: Rafi and Nanu on the couch, Ammu on the phone. These are the server's seed profiles.

## Timeline

| Time | Beat | On screen | Step needed |
|---|---|---|---|
| 0:00–0:10 | Hook | Couch, TV on Huddle. A phone draws a cat, the cat appears on the TV. Cut to title. | 5 (until then: couch + Home) |
| 0:10–0:25 | Who's here | Who's here? Pick Rafi and Nanu with the remote. Home greets them by name. | 1 |
| 0:25–0:45 | Home, live | Slow pass over the grid: clock and Open-Meteo weather, family calendar, smart home tile. Focus ring moves with the D-pad. | 3 |
| 0:45–1:25 | Phone joins | Connect phone → QR. Phone scans, picks Ammu. Ammu joins Who's here on the TV. Phone sends "Pizza night at 7" → toast on the TV. Phone adds "Dentist, Thu 4pm" → calendar updates. Phone turns the lamp off → smart home tile updates. | 2, 3 |
| 1:25–1:55 | Tonight + AI chat | Tonight tile: Bedrock picks for Rafi, Nanu and Ammu, each with a one-line why. Phone asks the AI "something short, Nanu is tired" → reply on the phone. | 4 |
| 1:55–2:30 | Sketch it | TV picks Ammu to draw. Ammu's phone shows the secret prompt. Strokes appear live on the TV. Rafi's phone guesses wrong, then right. Score on the TV. | 5 |
| 2:30–2:45 | Architecture | One slide (see below). | none |
| 2:45–2:55 | Close | Back on Home with everyone on Who's here. Name and one-liner. | 3 |

## Voiceover

Read slowly. About 2.5 words a second. Each line fits its beat.

| Beat | Line |
|---|---|
| Hook | "The TV is the one screen our whole family shares. Its home screen knows nothing about us. Huddle Home fixes that." |
| Who's here | "Open Huddle and tell it who's on the couch. The home screen is now for Rafi and Nanu." |
| Home, live | "Real weather, the family calendar, and the house, all on one screen. Every tile works with the remote." |
| Phone joins | "Any phone joins with a QR code. No app to install. Ammu is in. She sends a message, adds the dentist to the calendar, and turns the lamp off. The TV updates live." |
| Tonight + AI chat | "Tonight asks Amazon Bedrock what to watch, for the people in the room. From the phone, you can just ask." |
| Sketch it | "And when it's game night: Sketch it. One phone is the pen, the TV is the canvas, everyone else guesses from their phone." |
| Architecture | "React Native for Vega on the TV. A web companion on the phone. One realtime server. Bedrock, DynamoDB and S3 on AWS. Our D-pad focus kit is open source." |
| Close | "Huddle Home. The Fire TV home screen, rebuilt for the whole family." |

## Architecture slide (15 s)

One 1920x1080 slide, same theme as the app. Left to right:

- Fire TV (Vega OS): React Native for Vega, `tv-focus-kit`
- Phones: React web companion, joined by QR
- Server: Node WebSocket hub, one household protocol for TV, phones and future displays
- AWS: Bedrock (Tonight, chat, Sketch it prompts), DynamoDB, S3

No more than 20 words of text on the slide. The voiceover carries the rest.

## Shot list

| # | Shot | Device | What to capture | Merged first |
|---|---|---|---|---|
| 1 | Couch wide | Camera or phone on a tripod | Family on the couch, TV showing Huddle Home. 10 s, no dialogue. | 3 |
| 2 | Sketch it teaser | Camera | Phone in hand drawing, TV in the background showing the strokes. 5 s. | 5 |
| 3 | Who's here | VVD | Who's here? → select Rafi, Nanu → Home with the greeting | 1 |
| 4 | Home pass | VVD | D-pad across weather, calendar, smart home tiles. Weather must show live data. | 3 |
| 5 | Connect overlay | VVD | Select Connect phone, QR overlay opens | 2 |
| 6 | Scan QR | Camera, phone in hand | Phone camera on the TV QR, companion opens | 2 |
| 7 | Pick Ammu | iPhone screen recording | Join page → pick Ammu | 2 |
| 8 | Ammu on the TV | VVD | Ammu's avatar appears in Who's here | 2 |
| 9 | Message | iPhone recording + VVD | Type "Pizza night at 7", send. TV toast with sender. | 2 |
| 10 | Calendar add | iPhone recording + VVD | + Add → "Dentist", Thu 4pm, pick Nanu → TV calendar updates | 3 |
| 11 | Lamp off | iPhone recording + VVD | Smart home → Lamp off → TV tile updates | 3 |
| 12 | Tonight | VVD | Open Tonight → picks with why lines (record after step 4) | 4 |
| 13 | AI chat | iPhone recording | Ask "something short, Nanu is tired" → reply (record after step 4) | 4 |
| 14 | Sketch it, drawer | iPhone recording | Secret prompt, drawing the prompt (record after step 5) | 5 |
| 15 | Sketch it, TV | VVD | Strokes appearing live, guesses, score (record after step 5) | 5 |
| 16 | Sketch it, guesser | Second phone recording | Wrong guess, then right guess (record after step 5) | 5 |
| 17 | Close | VVD | Home with three people on Who's here | 3 |

Shots 9–11 and 14–16 are split screen in the edit: phone on the left, TV on the right, same moment. Record the phone and the VVD at the same time so they line up.

## Recording on macOS

**Before you record**
- Server running, VVD running the latest build from `main`, companion open on a real phone on the same Wi-Fi (README › Networking).
- Restart the server so the seed household and calendar are clean.
- Phone: Do Not Disturb on, full battery, brightness up, time set to something plain.
- Mac: hide the Dock and desktop icons, Do Not Disturb on.

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

## Edit and export checklist

- [ ] Cut to the timeline above. Total under 2:55, checked in the editor.
- [ ] Hook and Who's here land in the first 25 s.
- [ ] Split screen for phone + TV moments, phone on the left.
- [ ] Voiceover recorded in a quiet room, levels even, music ducked under it.
- [ ] Royalty-free music only (YouTube Audio Library or similar). Note the track and license in the Devpost text.
- [ ] Burned-in captions for every voiceover line. Large, high contrast, inside the safe area.
- [ ] No placeholder tiles, debug text, or error toasts visible in any frame.
- [ ] Export 1080p (1920x1080), H.264, 30 fps.
- [ ] Upload to YouTube as Unlisted. Open the link in a private window to check it plays.
- [ ] Paste the YouTube link into Devpost. Add the timestamps of each beat to the description.

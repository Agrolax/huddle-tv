# Submit-day runbook (Oct 23)

Deadline **3:00pm EDT**; target noon. Everything here is only what needs you. The rest is done: [checklist](checklist.md) has the full state.

## Already done (Oct 23 morning, no UI changes)
- **Demo video rendered**, 2:27, silent with burned-in captions, no music: `.tmp/demo/out/huddle-home-demo.mp4` (gitignored). Made by `scripts/demo/` from the real TV app on the Vega Virtual Device with scripted phones. Beats: Who's here → Home → phone joins by QR → message, calendar, lamp → Tonight with "Ends by 9:30 (Rafi's bedtime)" → secret vote → quiz → Sketch the pick → Built on Vega card → close.
- Six 1920×1080 stills for the Devpost gallery: [gallery/](gallery/).
- Devpost description filled (video link is the only TODO), `tv-focus-kit` has its own `LICENSE`, friction log is at 16 entries (FL-16 is new).
- `npm run check` passes (about 257 tests). A pattern scan of tracked files for AWS keys, GitHub tokens and private keys found nothing.

## Do these, in order
1. **Watch the video (2.5 min).** Look for anything wrong on screen. If you want a change in wording, edit `scripts/demo/record.mjs` captions and re-run (below).
2. **Bedrock take (about 10 min, recommended for the AWS Builder challenge).** The take above runs the offline demo AI, so the Tonight sheet says "Demo picks". Judges for that challenge want to see Bedrock live.
   ```bash
   aws login                       # opens the browser; us-east-1
   source ~/vega/env && HUDDLE_AI=bedrock node scripts/demo/record.mjs && HUDDLE_AI=bedrock node scripts/demo/assemble.mjs
   ```
   Check the Tonight sheet footer no longer says "Demo picks" (and the quiz stays on Our Week, which uses no model). If Bedrock errors, the server falls back to the mock and the footer says so: use the first take instead.
3. **Upload to YouTube, Public** (Unlisted can be refused). Title: `Huddle Home: the Fire TV home screen for the whole family (Vega OS)`. Paste this description:
   ```
   Huddle Home is a family home-screen app for Fire TV on Vega OS. Built with React Native for Vega, Amazon Bedrock and a phone companion joined by QR. No audio.
   0:00 The problem · 0:05 Who's here · 0:14 Live widgets · 0:28 Phone joins by QR · 0:54 Tonight, bedtime-aware · 1:04 Secret vote · 1:22 Household quiz · 1:54 Sketch the pick · 2:13 Built on Vega
   https://github.com/Agrolax/huddle-tv
   ```
   Open the link in a private window to check it plays.
4. **Merge the PR** with this prep work (I have not committed anything yet; say so and I open it). Then make the repo public:
   ```bash
   gh repo edit Agrolax/huddle-tv --visibility public --accept-visibility-change-consequences
   ```
   Check the About box shows "MIT license". If you would rather keep it private, invite `testing@devpost.com`, `chris-trag`, `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar` at submit time instead.
5. **Edit three lines that only you can vouch for**, in [product-feedback.md](product-feedback.md): the `[confirm]` on onboarding times (two places), on which Builder Tools calls you used, and the Bedrock cost (credits page). Delete the "Kiro and the AWS Knowledge MCP" section if you did not use them. Then search the file for `[confirm`: there should be none.
6. **Fill Devpost** from [devpost-description.md](devpost-description.md) (copy each section into its field). Fields that are not in that file:
   - Track: **Fire TV**. Mini challenges: **AWS Builder**, **Open Source**.
   - Video URL: the YouTube link (also replace `TODO YouTube link` in the file if you keep it).
   - Gallery: three to five of the stills in [gallery/](gallery/).
   - Product feedback: paste [product-feedback.md](product-feedback.md). Friction log: link [friction-log.md](friction-log.md) and paste the entries.
   - Open Source fields: contribution `https://github.com/Agrolax/huddle-tv/tree/main/packages/tv-focus-kit`, project repo `https://github.com/Agrolax/huddle-tv`, GitHub username `Agrolax`, and the "Open source" paragraph from the description.
7. **Preview as a judge**: video plays in a private window, repo link opens while logged out, license shows. Submit, then screenshot the confirmation.

## Not done, and why
- **AWS Budget alert** ($25/$50/$75): needs your OK in the console. Add the final credits used to the Bedrock section of the product feedback.
- **Hosted demo / `.vpkg` release**: skipped (default D4). The description says judges can score from the video and text, and gives the local run steps.
- **Real-phone QR scan**: not tested with a physical phone. The video uses scripted phones that speak the same protocol as the web companion.
- **Redesign, focus and Back audit, scalable UI audit**: not started. The video shows today's UI. If you redesign, re-run `record.mjs` and `assemble.mjs` (8 minutes); the key presses may need a tweak if the layout changes.
- **Voiceover, couch shots, Claude Code with the Builder Tools MCP on screen, architecture slide**: not in the take. The take stands without them.
- **Focus kit from a clean app outside the monorepo**: not checked.

## If something breaks
- The TV shows "another TV owns this household" after you restart the server and then the app. Restart the server first, then launch the app (a known gap: the claim lives in server memory).
- The TV says it cannot connect: the server URL is baked in at build time. After a network change run `npm run build:tv && npm run tv:install`.
- `record.mjs` prints what it was waiting for when it fails. `--dry` is a faster walk-through with screenshots.

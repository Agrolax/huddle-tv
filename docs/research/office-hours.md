# Office hours notes

## #1: Tue Oct 6 (Chris, Courtney, Emerson from the Amazon team)

Our two questions (launching other apps from ours; how Vega vs Fire OS is judged) **were not answered on the call**. Ask them on the Devpost forum / Discord, or bring them to #2 (Oct 19).

### What they said, and what it means for Huddle

| They said | For us |
|---|---|
| Fire TV is a fraction of Alexa+'s entries but has the same prize tiers | Confirms the track choice (see [competition snapshot](references.md#competition-snapshot-amazon-slide-public-repos-as-of-oct-1-directional-only)) |
| **Don't reinvent the wheel.** If Fire TV or an LLM can already do it, it probably won't pass round one. Their example of "obvious": showing a Ring camera feed on Fire TV | Our Ring "someone's at the door" bonus idea is close to their example of what not to build. Keep it out unless it does something Fire TV + Ring can't already. A nicer app grid is the same trap: lead with household adaptation, phone → TV and ambient mode |
| **One thing that works really well beats a big project that half works** | Our biggest risk: Huddle is a whole home screen. Make the MVP loop flawless before any should-have. Cut harder at the Oct 16 checkpoint |
| Judges **may only read the text and watch the video**; running the code is optional. The video must be very strong, like a trailer | The video carries the score. Plan the shots early (see [demo-script.md](../submission/demo-script.md)) |
| Polly or other natural AI voices give the video more polish | Voice over the demo with Polly. It doubles as proof that we use Polly (AWS Builder) |
| Setup should be close to one click: **no API keys or third-party sign-ups for judges**, provide demo credentials, keep any hosted environment live through judging (Nov 9–20) | Keep a hosted demo server up through Nov 20, with a seeded demo household. Ship the Vega package (`.vpkg`) and Virtual Device steps in GitHub Releases. Companion opens from a URL. Add a mock/offline mode so the TV app runs without AWS. README setup should take a few commands |
| AWS Builder: **live Bedrock calls are expected**; diagrams or mocks alone won't do. Localhost is fine | Tonight / brief / NL events call Bedrock for real; show it working on screen. Any diagram must be clean and accurate ("no slop") |
| They're curious about TVs used as **dashboards in shared spaces**, not only for watching (Nando's kitchen screens) | Backs up the family board + ambient mode. Say so in the pitch |
| **Nobody has cracked a back-and-forth voice conversation with AI on a TV.** Maybe TV + phone. "That would really push the envelope" (not a judge's opinion, but a clear hint) | Our Transcribe (phone) + Polly (TV) + Bedrock plan is close to this. A multi-turn voice **Tonight** conversation ("something funny for me and the kids" → "Not too long?" → picks) would answer it directly. Candidate to promote from should-have; see open decision below |
| Elderly / caregiver / accessibility projects went down well in their internal hackathon | Supports the grandparent persona and "Care mode" in the [ideas backlog](../product/ideas-backlog.md) |
| Ground the idea in a real need and tell it as a story. Mentioning a pivot is fine if it adds to the story | The video hook ("the one screen we all share knows nothing about us") fits. The party game → Huddle pivot isn't worth mentioning |
| Product feedback and a wishlist matter (prize multiplier). Report bugs as you hit them | Keep feeding [friction-log.md](../submission/friction-log.md) and [product-feedback.md](../submission/product-feedback.md) |
| Repo can be private if the reviewers are invited. Fill in every Devpost field. Don't submit early; edits are allowed until the deadline. Ask Devpost support early, not on the last day | Already in the [checklist](../submission/checklist.md) |
| Security issues: report them to Amazon right away, don't publish them | Just in case |

### Open decision
- **Promote voice Tonight (multi-turn, phone mic → TV voice) to MVP?** Pro: it's what they said is missing, and it fits "multi-modal voice + D-pad + visual". Con: more scope, against their "one thing really well" advice. Possible middle ground: keep M6 as is and make voice a single extra turn on the same flow.

### Additional notes from the full call summary (Oct 6)
- **Track mix:** ~70% of public projects use Alexa+. Ring + Bee together ≈ Fire TV in submission volume, with similar prize pools.
- **Don't rebuild what's native** (PDF summaries, package detection, Ring feed on Fire TV). But "the device physically can't do it" is too far; "this data can't flow between these systems today" is fine.
- **Start from a real need, ideally your own.** Search Reddit/community forums for problems people are trying to solve. See [community-research.md](community-research.md) for the Vega 2.0 home-screen complaints.
- **Localhost demos are fine**; conceptual diagrams with no working prototype are not. Live Bedrock calls strongly preferred. Calling Bedrock/SNS from our own server counts as an AWS integration.
- **Kiro Crew mini challenge** (if we use Kiro): explain the use case and what it solved, not just that we used it. Resources: AWS Knowledge MCP server, builder.aws.com workshops.
- **Open Source mini challenge:** building on top of an existing open-source MCP qualifies.
- **Standout examples they gave:** workout form coach (Fire TV + Ring CV + pose estimation); WonderGuard (Ring + Alexa+ for dementia caretakers); Sketchy AF (Fire TV drawing/guessing game). Accessibility/caretaker ideas were popular. **Fire TV as a kitchen/workspace dashboard is underexplored**, which fits our family board + ambient mode.
- **Next steps from the call:** share links on the hackathon Discord; report any security vulnerability through Amazon's web form first, then tell the hackathon team (extra credit), and keep the repo private meanwhile; **Bedrock access problems go to the AWS Support subreddit** (the team can't fix account-level issues).
- Transcript: https://notes.granola.ai/t/c7f3d743-8f69-4814-a059-cf98d38f0711

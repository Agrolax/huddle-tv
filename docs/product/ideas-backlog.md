# Ideas backlog

Parked ideas. Move one into the PRD only when the MVP is green.

## Huddle Games (bonus: original concept)
AI-hosted party trivia. TV shows a QR code, phones become controllers, the family picks themes and ages, and Bedrock generates the questions. Optional Polly host voice. Launched as a full-screen "app" from Huddle Home.
- Reuses the phone companion + WebSocket server, so it's cheap once MVP exists
- Screens: lobby (QR + players), theme setup, question, reveal, leaderboard, podium
- Phone: 4 big shape/colour buttons (▲ ◆ ● ■)
- Event protocol: `room:create`, `player:join`, `game:configure`, `question:show`, `answer:submit`, `question:reveal`, `leaderboard:show`, `game:end`

## Other ideas
- **Ring tile**: doorbell event → TV overlay "Someone's at the door" with snapshot (Ring API / simulator)
- **MCP server for Huddle**: tools like `post_to_board`, `add_event`, `whats_on_tonight`, so external agents (Claude, Alexa+-style assistants) can act on the household
- **Chore rotation** widget with streaks for kids
- **Cooking timer** widget, controllable from phone
- **Watch party mode**: everyone votes on Tonight picks from their phones
- **Bee integration**: meeting/convo notes → "family reminders" on the board (Bee track, cross-device)
- **Care mode**: simplified UI + medication reminders for grandparents (accessibility angle)
- **Kids mode**: time limits, only approved apps in the row

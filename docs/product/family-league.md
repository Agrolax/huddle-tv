# Family league

## What it is today
A scoreboard that spans games. After every **finished** quiz or Sketch the pick game, each person who played gets their points added, one win if they had the top score (above zero), and one game played. The code is `addToLeague` in `packages/shared/src/game.ts`. The totals show on the TV's Game night sheet and on the phone. Stopping a game early counts for nothing.

Stored: points, wins and games per person. That is all.

**Limits right now**
- It lives in the server's memory. A restart wipes it ([household.ts](../../apps/server/src/household.ts): `league: {}`).
- It never resets or ends, so the leader after a month is whoever played most.
- There is no reason to open it between games.

## Why it matters to the pitch
The research gap was "memory across nights": no Fire TV or Alexa product keeps a household score or knows whose turn it is ([differentiation.md](../research/differentiation.md), gap 4). The league is the only part of Huddle that remembers, so it needs to survive a restart to be true.

## Do we need DynamoDB or S3 for it?
No to S3: it stores files, and the league has none.

DynamoDB is one way to make it survive a restart, not a requirement. The league is three numbers per person. The plain options, from least to most work:
1. **A JSON file on the server** written after each finished game. About an hour, no AWS, fine for a one-server hosted demo.
2. **DynamoDB**, one item per household, also holding profiles and calendar. A few hours plus table setup, IAM and a local fallback. Worth it only if we want "AWS services" beyond Bedrock, or a server that can be redeployed without losing data.
3. **Nothing**, and say in the submission that state is in memory. Honest and free, but the "league carries over" line must then be worded as "within a session".

## Ideas to make it a real league (pick at most one)
| Idea | What it does | Effort |
|---|---|---|
| **Weekly season** | Resets every Monday, a "last week's winner" line on the Game night tile | Small. Needs persistence |
| **Fair turn** | The household remembers who picked last night; "It's Nanu's turn" gives their taste double weight in Tonight | Small. Needs persistence |
| **Earned pick power** | The winner of game night breaks ties in tonight's veto | Small, and ties the games to the decision |
| **Family Wrapped** | End of month card: most wins, most-vetoed genre, best streak | Needs history, not just totals |
| **Kids' handicap** | Younger players get bonus points so the league is fair | Small |

Recommended if only one: **earned pick power**. It links game night to the veto, which is the whole pitch ("the game ends on the decision"), and it needs only the existing totals.

## Decisions for you
- Persist it (JSON file, DynamoDB) or word the claim as "within a session"?
- Add one of the ideas above, or leave the league as a scoreboard?

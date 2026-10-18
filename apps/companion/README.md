# apps/companion

Phone web app (React + Vite), opened from the TV's QR code: `http://<LAN IP>:5173/?h=<household>&c=<code>`.

Join the household, pick who you are, switch who's watching (multi-select, live on the TV), send a message to the TV (≤ 280 characters), the family calendar and smart home (step 3), **Ask the AI** (streamed answers, ≤ 500 characters per question) and **Tonight** picks by mood, which also land on the TV (step 4), game night quiz answers (step 5), and the secret veto (yes/no per pick, in private), drawing and guessing in Sketch the pick (step 6).

- Server URL: `?s=ws://…`, else `VITE_HUDDLE_SERVER_URL` (`.env.example`), else `ws://<page host>:8787/ws`.
- Remembers household, session token and "who I am" in `localStorage`, so a reload reconnects without rescanning.

```bash
npm run dev -w @huddle/companion   # vite --host, so phones on the LAN can open it
```

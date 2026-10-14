# apps/companion

Phone web app (React + Vite), opened from the TV's QR code: `http://<LAN IP>:5173/?h=<household>&c=<code>`.

Step 2: join the household, pick who you are, switch who's watching (multi-select, live on the TV), send a message to the TV (≤ 280 characters). AI chat and Sketch it are placeholders.

- Server URL: `?s=ws://…`, else `VITE_HUDDLE_SERVER_URL` (`.env.example`), else `ws://<page host>:8787/ws`.
- Remembers household, session token and "who I am" in `localStorage`, so a reload reconnects without rescanning.

```bash
npm run dev -w @huddle/companion   # vite --host, so phones on the LAN can open it
```

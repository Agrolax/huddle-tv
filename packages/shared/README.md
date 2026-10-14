# @huddle/shared

Used by the TV app, the phone companion and the server.

- `src/theme.ts`: 10-foot UI tokens (colours, type scale, spacing, radius, focus) for 1920×1080.
- `src/protocol.ts`: the realtime protocol. Every WebSocket frame is an `Envelope` (`v`, `id`, `ts`, `type`, `payload`).
  - **Roles:** `tv`, `phone`, `display` (a read-mostly second screen such as an Echo Show web view or a tablet), `voice` (an Alexa skill backend).
  - **Topics:** `household`, `calendar`, `messages`, `chat`, `tonight`, `sketch`, `smart-home`. A client sends `hello` with its role, capabilities and topics. The server only pushes the topics it subscribed to (`shouldDeliver`).
  - **Permissions:** `CLIENT_MESSAGE_ROLES` says who may send what. For example, only phones draw (`sketch:stroke`), and a `display` can only `hello`, `subscribe` and `ping`.
  - Sketch it strokes use 0..1 coordinates, so any screen can render them at its own size.

Adding a new kind of screen means picking a role and topics. The server and the other clients don't change. See [docs/research/echo-show.md](../../docs/research/echo-show.md).

```bash
npm test -w @huddle/shared
```

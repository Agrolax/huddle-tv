# Echo Show as a second screen

Research only, Oct 14. Nothing here is built yet. Question: can an Echo Show join the household as a second display (family calendar, Sketch it guesses) that talks to `apps/server`?

## TL;DR

- **We can't install the Vega TV app on an Echo Show.** New Echo Shows run Vega OS, but there is no third-party app path for Echo devices: the Vega SDK, the Builder Tools MCP docs, and the Virtual Device all target Fire TV, and Vega has no sideloading.
- **The workable path is an Alexa skill.** It can show our own HTML page full-screen on the Echo Show (Alexa Web API for Games, `Alexa.Presentation.HTML`). That page is an ordinary web app, so in principle it can open a WebSocket to `apps/server` and join as a `display` client.
- **For an always-on calendar,** an APL widget fed by the **Data Store REST API** fits better than a live socket: the server pushes JSON, and the device renders it with no skill session open.
- **Recommendation:** after Sketch it works on TV + phone, build a small "Huddle Display" skill that opens `companion/#/display` on the Echo Show via `Alexa.Presentation.HTML`. That page connects as `role: 'display'` and shows the calendar plus live Sketch it guesses. The APL widget is a stretch goal. First, spend 30 minutes proving that the HTML runtime allows `wss://` to our host.

## What each source says

### Amazon Devices Builder Tools MCP (Vega docs)
- Searching "Echo Show" finds no guide for building a Vega app for Echo. The only hits are an i18n product-name example (`ProductNameFormat` lists "Echo Show 5") and a catalog note that **Echo Show uses Video Skills (VSK)** for video, without Universal Search and Browse.
- All build, run, and test docs target Fire TV devices and the Vega Virtual Device (`vvrp-tv-*`). No Echo virtual device or Echo device profile exists in SDK 0.24.
- This matches the PRD finding from Oct 7: Amazon's Vega FAQ sends Echo work to the Alexa developer portal.

### Alexa Web API for Games (`Alexa.Presentation.HTML`)
- A skill sends a `Start` directive with an HTTPS URL. The device then opens that page full-screen. Supported devices: Echo Show family, most Fire TV models, Astro.
- The page talks to the skill with `Alexa.create({version: '1.1'})`, then `message.sendMessage()` / `onMessage()`. The skill talks to the page with the `Alexa.Presentation.HTML.Message` directive.
- **Restrictions in the runtime:** no local storage, no Web SQL, no `getUserMedia`, no Web Speech, no `alert`/`prompt`, no `file://`. The host must use HTTPS with a trusted certificate. Cookies and history are cleared when the session ends.
- **Lifetime:** the page stays up until the user or skill ends the session, or the skill switches to another interface. `timeoutInSeconds` on `Start` keeps an idle session open for up to 30 minutes, but devices may lower that value.
- **WebSockets:** the docs don't say either way. Nothing in the disabled list blocks `WebSocket`, and the HTTPS rule means we must use `wss://`. **Unverified; test it on a real Echo Show first.**
- Separately, community reports describe a ~8 s limit on the skill backend's request/response. That limit applies to the skill Lambda, not to the page's own socket.

### APL + widgets + Data Store
- APL (`Alexa.Presentation.APL`) renders screen documents during a skill session. Updates come from skill responses or `ExecuteCommands`.
- **Widgets** sit on the Echo Show home screen, bind to an on-device **data store**, and render without calling the skill.
- **Data Store REST API**: a backend can push `PUT_OBJECT` commands from outside any skill session, targeted at a user or at specific devices. It uses client-credentials auth, regional endpoints, and queues commands while a device is offline. It requires the `Alexa.DataStore` interface on the skill.
- So the server can keep a calendar widget fresh without a socket. Latency is seconds, not frames: fine for a calendar, wrong for streaming strokes.

## Options compared

| Option | Live updates | Always on screen | Effort | Fit |
|---|---|---|---|---|
| Vega app on Echo Show | — | — | Not possible | ✗ No third-party Echo app path |
| **Skill + HTML web app (`Alexa.Presentation.HTML`)** | Yes, via our WebSocket (to verify) | Only during a skill session (idle timeout ≤ 30 min) | Medium: skill + reuse companion web code | ✓ Sketch it guesses, a "family board" session |
| **APL widget + Data Store REST API** | Push, seconds of latency | Yes, on the Echo Show home | Medium: APL doc + skill + OAuth client | ✓ Family calendar glance |
| APL in a skill session | Only per voice turn | No | Low–medium | Voice Q&A ("what's on today?") |
| Voice-only skill (Echo Dot Max) | — | — | Low | Post to board, ask Tonight |

## Recommended approach

1. **Protocol first (done in this step).** `packages/shared/src/protocol.ts` has a `display` role, per-role defaults (`DEFAULT_TOPICS.display = household, calendar, messages, sketch`), topic routing (`shouldDeliver`), and send permissions (`CLIENT_MESSAGE_ROLES`: a display can only `hello`, `subscribe`, `ping`). Strokes are normalised to 0..1, so any screen size can draw them. An Echo Show page, a fridge tablet, or a second TV joins with no server changes beyond auth.
2. **Spike (30 min, once we have a skill):** a minimal skill whose launch handler returns `Alexa.Presentation.HTML.Start` pointing to a test page. The page opens `wss://<host>/ws` and echoes a message. If the socket is blocked, fall back to relaying through the skill: server → skill backend → `HTML.Message` directive. That is clunky, but it works.
3. **Display page:** a `#/display` route in `apps/companion` (same Vite build, same `@huddle/shared` types) with a landscape layout for 1024×600 / 1280×800. It connects with `{role: 'display', capabilities: {canvas: true, screen: 'smart-display'}}`. It shows today's calendar, and during a Sketch it round it shows the live canvas and incoming guesses.
4. **Pairing:** the skill uses account linking or a spoken household code ("Alexa, open Huddle Display, code H7K2QP"). The skill backend passes `householdId` and a short-lived token in the `Start` URL. The page sends it in `hello.pairCode`.
5. **Stretch:** a calendar APL widget kept fresh by the server through the Data Store REST API (`calendar:updated` → `PUT_OBJECT`).

**Order in the plan:** after the Sketch it MVP (TV + phones) works. Do not start before then. It needs an Alexa developer account, a hosted HTTPS server, and a real Echo Show to test on. The simulator in the Alexa console is not proof.

## Open questions
- Does the HTML runtime allow `wss://` to a third-party origin? Is there a CSP? (spike)
- Do widgets from custom skills appear on Echo Show devices running Vega OS with Alexa+, or only on the older Fire OS based Shows?
- Does Alexa+ change the HTML/APL story on new Echo Shows (Alexa+ might route "open Huddle" differently)?

## Sources
- [About Alexa Web API for Games](https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-about.html)
- [Build your web app for Alexa (runtime restrictions, `Alexa.create`)](https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-build-your-webapp.html)
- [Build your Alexa skill for web app games (`Start` directive, `timeoutInSeconds`)](https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-build-your-skill.html)
- [APL interface reference (RenderDocument, ExecuteCommands, DataStore)](https://developer.amazon.com/en-IN/docs/alexa/alexa-presentation-language/apl-request-response-reference.html)
- [Understand the APL lifecycle](https://developer.amazon.com/docs/alexa-presentation-language/apl-bp-understand-apl-lifecycles.html)
- [Data Store REST API reference](https://developer.amazon.com/docs/alexa-presentation-language/data-store-rest-api-reference.html)
- [Announcing Vega OS / Vega Developer Tools](https://developer.amazon.com/apps-and-games/blogs/2025/09/announcing-vega-os)
- [Vega on the new Echo Show 5 (AFTVnews)](https://www.aftvnews.com/amazons-in-house-vega-os-is-already-on-the-new-echo-show-5/)
- Amazon Devices Builder Tools MCP, `search_documentation("Echo Show")` on `vega_os`: no Echo app guidance; `catalog_ingestion_getting_started.md` notes VSK on Echo Show

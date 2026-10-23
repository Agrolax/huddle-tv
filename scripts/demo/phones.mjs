// Scripted phones for the demo recording. They speak the real household protocol
// (packages/shared/src/protocol.ts) the same way apps/companion does, so the TV
// reacts exactly as it does to a person's phone.
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export class Phone {
  constructor(ws, profileId) {
    this.ws = ws;
    this.profileId = profileId;
    this.game = null;
    this.vote = null;
    this.prompt = null;
    this.waiters = [];
    ws.on('message', raw => this.onFrame(JSON.parse(raw.toString())));
  }

  static async join(url, code, profileId, label, householdId = 'home') {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    const phone = new Phone(ws, profileId);
    const welcome = phone.waitFor(f => f.type === 'welcome' || f.type === 'error', 5000);
    phone.send('hello', {
      householdId,
      client: {clientId: `phone-${randomUUID().slice(0, 8)}`, role: 'phone', label, profileId},
      capabilities: {touch: true, text: true, screen: 'phone'},
      topics: [],
      pairCode: code,
    });
    const first = await welcome;
    if (first.type === 'error') throw new Error(`${label}: ${first.payload.code} ${first.payload.message}`);
    phone.game = first.payload.snapshot.game;
    phone.vote = first.payload.snapshot.vote;
    return phone;
  }

  send(type, payload) {
    this.ws.send(JSON.stringify({v: 1, id: randomUUID().slice(0, 8), ts: Date.now(), type, payload}));
  }

  onFrame(f) {
    if (f.type === 'game:state') this.game = f.payload;
    if (f.type === 'tonight:vote-state') this.vote = f.payload;
    if (f.type === 'sketch:prompt') this.prompt = f.payload;
    this.waiters = this.waiters.filter(w => !w.test(f));
  }

  waitFor(pred, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timed out waiting for a frame')), timeoutMs);
      this.waiters.push({
        test: f => {
          if (!pred(f)) return false;
          clearTimeout(t);
          resolve(f);
          return true;
        },
      });
    });
  }

  /** Resolves when `game` (kept current from game:state frames) satisfies `pred`. */
  async untilGame(pred, timeoutMs = 20000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (this.game && pred(this.game)) return this.game;
      await sleep(100);
    }
    throw new Error(`game never reached the expected state (last: ${JSON.stringify(this.game?.phase)})`);
  }

  async untilVote(pred, timeoutMs = 20000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (this.vote && pred(this.vote)) return this.vote;
      await sleep(100);
    }
    throw new Error('vote never reached the expected state');
  }

  /** Streams one stroke in small pieces, the way a finger does. */
  async drawStroke(gameId, round, id, color, pts, pieceSize = 4, gapMs = 70) {
    for (let i = 0; i < pts.length; i += pieceSize) {
      const slice = pts.slice(Math.max(0, i - 1), i + pieceSize);
      this.send('sketch:stroke', {gameId, round, stroke: {id, color, width: 0.012, points: slice}});
      await sleep(gapMs);
    }
  }

  close() {
    this.ws.close();
  }
}

// --- Doodle geometry (0..1 canvas coordinates) -------------------------------

const circle = (cx, cy, r, n = 28) =>
  Array.from({length: n + 1}, (_, i) => ({x: cx + r * Math.cos((i / n) * 2 * Math.PI), y: cy + r * Math.sin((i / n) * 2 * Math.PI)}));
const line = (x1, y1, x2, y2, n = 8) =>
  Array.from({length: n + 1}, (_, i) => ({x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n}));

/** A bear in a hat: head, round ears, eyes, nose, a red hat. */
export const CAT_BEAR = [
  {color: '#F5A524', pts: circle(0.5, 0.6, 0.24)},
  {color: '#F5A524', pts: circle(0.3, 0.42, 0.07, 14)},
  {color: '#F5A524', pts: circle(0.7, 0.42, 0.07, 14)},
  {color: '#F4F1EA', pts: circle(0.42, 0.56, 0.025, 10)},
  {color: '#F4F1EA', pts: circle(0.58, 0.56, 0.025, 10)},
  {color: '#F4F1EA', pts: circle(0.5, 0.65, 0.035, 10)},
  {color: '#E85D5D', pts: [...line(0.32, 0.38, 0.5, 0.12), ...line(0.5, 0.12, 0.68, 0.38), ...line(0.68, 0.38, 0.32, 0.38)]},
  {color: '#3D8BFF', pts: line(0.4, 0.74, 0.6, 0.74)},
];

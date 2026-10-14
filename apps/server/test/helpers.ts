import {createServer, Server} from 'node:http';
import {AddressInfo} from 'node:net';
import {WebSocket, WebSocketServer} from 'ws';
import {PROTOCOL_VERSION} from '@huddle/shared';
import {Hub, HubOptions} from '../src/hub.js';

export interface TestServer {
  url: string;
  hub: Hub;
  clock: {now: number};
  close: () => Promise<void>;
}

export async function startServer(opts: Partial<HubOptions> = {}): Promise<TestServer> {
  const clock = {now: 1_000_000};
  const hub = new Hub({companionUrl: 'http://10.0.0.5:5173/', now: () => clock.now, ...opts});
  const http: Server = createServer();
  const wss = new WebSocketServer({server: http, path: '/ws'});
  wss.on('connection', socket => {
    const {onMessage, onClose} = hub.connect(socket);
    socket.on('message', data => onMessage(data.toString()));
    socket.on('close', onClose);
  });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const {port} = http.address() as AddressInfo;
  return {
    url: `ws://127.0.0.1:${port}/ws`,
    hub,
    clock,
    close: async () => {
      for (const c of wss.clients) c.terminate();
      await new Promise<void>(resolve => wss.close(() => http.close(() => resolve())));
    },
  };
}

export interface Frame {
  type: string;
  payload: any;
  id: string;
}

/** A test client that queues every frame so tests can await them in order. */
export class TestClient {
  readonly ws: WebSocket;
  private queue: Frame[] = [];
  private waiters: Array<(f: Frame) => void> = [];
  readonly closed: Promise<{code: number; reason: string}>;

  private constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('message', data => {
      const frame = JSON.parse(data.toString()) as Frame;
      const waiter = this.waiters.shift();
      if (waiter) waiter(frame);
      else this.queue.push(frame);
    });
    this.closed = new Promise(resolve => this.ws.on('close', (code, reason) => resolve({code, reason: reason.toString()})));
  }

  static async open(url: string): Promise<TestClient> {
    const c = new TestClient(url);
    await new Promise<void>((resolve, reject) => {
      c.ws.once('open', () => resolve());
      c.ws.once('error', reject);
    });
    return c;
  }

  sendRaw(data: string): void {
    this.ws.send(data);
  }

  send(type: string, payload: unknown, id = Math.random().toString(36).slice(2)): string {
    this.ws.send(JSON.stringify({v: PROTOCOL_VERSION, id, ts: Date.now(), type, payload}));
    return id;
  }

  next(timeoutMs = 1000): Promise<Frame> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timed out waiting for a frame')), timeoutMs);
      this.waiters.push(f => {
        clearTimeout(t);
        resolve(f);
      });
    });
  }

  /** Skips frames until one of `type` arrives. */
  async nextOf(type: string, timeoutMs = 1000): Promise<Frame> {
    for (;;) {
      const f = await this.next(timeoutMs);
      if (f.type === type) return f;
    }
  }

  /** Resolves true if no frame of `type` arrives within `ms` (other frames are discarded). */
  async noneOf(type: string, ms = 150): Promise<boolean> {
    const deadline = Date.now() + ms;
    for (;;) {
      const left = deadline - Date.now();
      if (left <= 0) return true;
      try {
        if ((await this.next(left)).type === type) return false;
      } catch {
        return true;
      }
    }
  }

  close(): void {
    this.ws.close();
  }
}

export function hello(role: string, extra: Record<string, unknown> = {}, householdId = 'home') {
  return {householdId, client: {clientId: `${role}-${Math.random().toString(36).slice(2, 8)}`, role}, capabilities: {}, topics: [], ...extra};
}

/** A TV that has claimed `householdId`, plus a fresh pair code. */
export async function claimTv(url: string, householdId = 'home') {
  const tv = await TestClient.open(url);
  tv.send('hello', hello('tv', {}, householdId));
  const welcome = await tv.nextOf('welcome');
  tv.send('pair:request', {});
  const code = await tv.nextOf('pair:code');
  return {tv, token: welcome.payload.token as string, pair: code.payload as {code: string; expiresAt: number; joinUrl: string}};
}

export async function pairPhone(url: string, code: string, extra: Record<string, unknown> = {}, householdId = 'home') {
  const phone = await TestClient.open(url);
  phone.send('hello', hello('phone', {pairCode: code, ...extra}, householdId));
  const welcome = await phone.next();
  return {phone, welcome};
}

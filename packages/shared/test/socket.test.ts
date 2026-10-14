import {HuddleSocket, SocketLike, backoffDelay} from '../src/socket';
import {PROTOCOL_VERSION} from '../src/protocol';

class FakeSocket implements SocketLike {
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: Array<{type: string; payload: any}> = [];
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: {data: unknown}) => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
    this.readyState = 3;
  }
  // test helpers
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(type: string, payload: unknown) {
    this.onmessage?.({data: JSON.stringify({v: PROTOCOL_VERSION, id: Math.random().toString(36), ts: 0, type, payload})});
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({});
  }
}

const hello = () => ({householdId: 'demo', client: {clientId: 'tv-1', role: 'tv' as const}, capabilities: {}, topics: []});
const welcome = (token = 'tok-1') => ({snapshot: {}, you: {clientId: 'tv-1', role: 'tv'}, token});

function make(extra: Partial<ConstructorParameters<typeof HuddleSocket>[0]> = {}) {
  const statuses: string[] = [];
  const messages: string[] = [];
  const socket = new HuddleSocket({
    url: 'ws://test/ws',
    hello,
    onMessage: m => messages.push(m.type),
    onStatus: s => statuses.push(s),
    createSocket: url => new FakeSocket(url),
    random: () => 0.5, // no jitter
    pingIntervalMs: 0,
    ...extra,
  });
  return {socket, statuses, messages};
}

beforeEach(() => {
  FakeSocket.all = [];
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('backoffDelay', () => {
  it('doubles up to the cap', () => {
    const opts = {initialMs: 500, maxMs: 10_000, factor: 2, jitter: 0};
    expect([0, 1, 2, 3, 4, 5, 6].map(a => backoffDelay(a, opts))).toEqual([500, 1000, 2000, 4000, 8000, 10_000, 10_000]);
  });
  it('applies jitter within bounds', () => {
    const opts = {initialMs: 1000, maxMs: 10_000, factor: 2, jitter: 0.2};
    expect(backoffDelay(0, opts, () => 0)).toBe(800);
    expect(backoffDelay(0, opts, () => 0.9999)).toBe(1200);
  });
});

describe('HuddleSocket', () => {
  it('sends hello on open and is open after welcome', () => {
    const {socket, statuses, messages} = make();
    socket.start();
    const ws = FakeSocket.all[0]!;
    ws.open();
    expect(ws.sent[0]!.type).toBe('hello');
    expect(socket.currentStatus).toBe('connecting');
    expect(socket.send('ping', {})).toBe(false); // not before welcome
    ws.receive('welcome', welcome());
    expect(socket.currentStatus).toBe('open');
    expect(statuses).toEqual(['connecting', 'open']);
    expect(messages).toEqual(['welcome']);
    expect(socket.send('ping', {})).toBe(true);
  });

  it('reconnects with backoff and sends the token it was given', () => {
    const tokens: string[] = [];
    const {socket} = make({onToken: t => tokens.push(t)});
    socket.start();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive('welcome', welcome('tok-A'));
    expect(tokens).toEqual(['tok-A']);

    FakeSocket.all[0]!.drop();
    expect(socket.currentStatus).toBe('reconnecting');
    jest.advanceTimersByTime(499);
    expect(FakeSocket.all).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(FakeSocket.all).toHaveLength(2);

    // Second attempt fails before opening: next delay doubles.
    FakeSocket.all[1]!.drop();
    jest.advanceTimersByTime(999);
    expect(FakeSocket.all).toHaveLength(2);
    jest.advanceTimersByTime(1);
    const ws = FakeSocket.all[2]!;
    ws.open();
    expect(ws.sent[0]!.payload.token).toBe('tok-A');
    ws.receive('welcome', welcome('tok-B'));
    expect(socket.currentToken).toBe('tok-B');

    // A welcome resets the backoff.
    ws.drop();
    jest.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(4);
  });

  it('stops on a fatal error before welcome', () => {
    const {socket, statuses, messages} = make();
    socket.start();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive('error', {code: 'pair-code-expired', message: 'expired'});
    expect(socket.currentStatus).toBe('failed');
    expect(statuses).toEqual(['connecting', 'failed']);
    expect(messages).toEqual(['error']);
    jest.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it('keeps going after a non-fatal error once open', () => {
    const {socket} = make();
    socket.start();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive('welcome', welcome());
    FakeSocket.all[0]!.receive('error', {code: 'bad-request', message: 'nope'});
    expect(socket.currentStatus).toBe('open');
  });

  it('stop() closes and does not reconnect', () => {
    const {socket} = make();
    socket.start();
    FakeSocket.all[0]!.open();
    socket.stop();
    expect(FakeSocket.all[0]!.closed).toBe(true);
    jest.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(1);
    expect(socket.currentStatus).toBe('closed');
  });

  it('drops a connection that stops answering pings', () => {
    const {socket} = make({pingIntervalMs: 1000, pongTimeoutMs: 500});
    socket.start();
    const ws = FakeSocket.all[0]!;
    ws.open();
    ws.receive('welcome', welcome());
    jest.advanceTimersByTime(1000);
    expect(ws.sent.map(m => m.type)).toEqual(['hello', 'ping']);
    jest.advanceTimersByTime(500);
    expect(ws.closed).toBe(true);
  });

  it('a pong keeps the connection', () => {
    const {socket} = make({pingIntervalMs: 1000, pongTimeoutMs: 500});
    socket.start();
    const ws = FakeSocket.all[0]!;
    ws.open();
    ws.receive('welcome', welcome());
    jest.advanceTimersByTime(1000);
    ws.receive('pong', {});
    jest.advanceTimersByTime(499);
    expect(ws.closed).toBe(false);
  });
});

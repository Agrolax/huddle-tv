/**
 * Reconnecting WebSocket client for the Huddle protocol. Runs anywhere with a
 * global `WebSocket` (React Native for Vega, browsers); tests inject a fake.
 *
 * - Sends `hello` on every (re)connect, adding the token from the last `welcome`.
 * - Reconnects with exponential backoff + jitter; resets after a `welcome`.
 * - Stops for good on a fatal error (bad/expired pair code, TV already claimed):
 *   reconnecting can't fix those, the user has to.
 * - Pings while idle and drops a connection that stops answering.
 */
import {
  ClientMessage,
  ErrorCode,
  FATAL_ERRORS,
  ServerEnvelope,
  envelope,
  parseEnvelope,
} from './protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'failed' | 'closed';

export interface StatusInfo {
  attempt: number;
  /** ms until the next attempt (status `reconnecting`). */
  retryInMs?: number;
  /** Set on `failed` and on server errors that end a connection attempt. */
  error?: {code: ErrorCode | 'network'; message: string};
}

export interface BackoffOptions {
  initialMs: number;
  maxMs: number;
  factor: number;
  /** 0..1, ± fraction of the delay. */
  jitter: number;
}

export const DEFAULT_BACKOFF: BackoffOptions = {initialMs: 500, maxMs: 10_000, factor: 2, jitter: 0.2};

/** Delay before reconnect attempt `attempt` (0-based). */
export function backoffDelay(attempt: number, opts: BackoffOptions = DEFAULT_BACKOFF, random: () => number = Math.random): number {
  const base = Math.min(opts.maxMs, opts.initialMs * Math.pow(opts.factor, Math.max(0, attempt)));
  const spread = base * opts.jitter;
  return Math.max(0, Math.round(base - spread + random() * 2 * spread));
}

type HelloPayload = Extract<ClientMessage, {type: 'hello'}>['payload'];

/** The subset of the WebSocket API we use. */
export interface SocketLike {
  readyState: number;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: {data: unknown}) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface HuddleSocketOptions {
  url: string;
  /** Called on every connect, so it can read fresh state (e.g. current profile). */
  hello: () => HelloPayload;
  onMessage: (msg: ServerEnvelope) => void;
  onStatus?: (status: ConnectionStatus, info: StatusInfo) => void;
  /** Called with the token from each `welcome`, e.g. to persist it. */
  onToken?: (token: string) => void;
  /** Token from a previous session. */
  token?: string;
  backoff?: Partial<BackoffOptions>;
  /** ms between pings while connected. 0 disables. Default 20s. */
  pingIntervalMs?: number;
  /** ms without any frame after a ping before the connection is dropped. Default 10s. */
  pongTimeoutMs?: number;
  createSocket?: (url: string) => SocketLike;
  random?: () => number;
}

const OPEN = 1;

// Module-local so the file typechecks without DOM types; at runtime this is the platform global.
declare const WebSocket: new (url: string) => SocketLike;

export class HuddleSocket {
  private socket: SocketLike | null = null;
  private status: ConnectionStatus = 'idle';
  private attempt = 0;
  private stopped = true;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | undefined;
  private readonly backoff: BackoffOptions;

  constructor(private readonly opts: HuddleSocketOptions) {
    this.token = opts.token;
    this.backoff = {...DEFAULT_BACKOFF, ...opts.backoff};
  }

  get currentStatus(): ConnectionStatus {
    return this.status;
  }

  get currentToken(): string | undefined {
    return this.token;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.attempt = 0;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close(1000, 'client stop');
    }
    this.setStatus('closed', {attempt: this.attempt});
  }

  /** Sends a message if the handshake is done. Returns false otherwise (callers decide whether to retry). */
  send<M extends ClientMessage>(type: M['type'], payload: M['payload']): boolean {
    if (this.status !== 'open' || !this.socket || this.socket.readyState !== OPEN) return false;
    this.socket.send(JSON.stringify(envelope<ClientMessage>(type, payload)));
    return true;
  }

  private connect(): void {
    this.clearTimers();
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting', {attempt: this.attempt});
    let socket: SocketLike;
    try {
      socket = this.opts.createSocket ? this.opts.createSocket(this.opts.url) : (new WebSocket(this.opts.url) as unknown as SocketLike);
    } catch (e) {
      this.scheduleReconnect({code: 'network', message: e instanceof Error ? e.message : String(e)});
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      const hello = this.opts.hello();
      const payload: HelloPayload = this.token ? {...hello, token: this.token} : hello;
      socket.send(JSON.stringify(envelope<ClientMessage>('hello', payload)));
    };

    socket.onmessage = ev => {
      if (typeof ev.data !== 'string') return;
      const msg = parseEnvelope(ev.data) as ServerEnvelope | null;
      if (!msg) return;
      this.armPongTimeout(false);
      if (msg.type === 'welcome') {
        const {token} = msg.payload as {token: string};
        this.token = token;
        this.opts.onToken?.(token);
        this.attempt = 0;
        this.setStatus('open', {attempt: 0});
        this.startPings();
      } else if (msg.type === 'error' && this.status !== 'open') {
        const err = msg.payload as {code: ErrorCode; message: string};
        if (FATAL_ERRORS.includes(err.code)) {
          this.fail(err);
          this.opts.onMessage(msg);
          return;
        }
      }
      this.opts.onMessage(msg);
    };

    socket.onerror = () => {
      // onclose follows; reconnect is handled there.
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearTimers();
      if (this.stopped || this.status === 'failed') return;
      this.scheduleReconnect({code: 'network', message: 'connection closed'});
    };
  }

  private scheduleReconnect(error: StatusInfo['error']): void {
    if (this.stopped) return;
    const delay = backoffDelay(this.attempt, this.backoff, this.opts.random);
    this.attempt += 1;
    this.setStatus('reconnecting', {attempt: this.attempt, retryInMs: delay, error});
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private fail(error: {code: ErrorCode; message: string}): void {
    this.stopped = true;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close(1000, error.code);
    }
    this.setStatus('failed', {attempt: this.attempt, error});
  }

  private startPings(): void {
    const every = this.opts.pingIntervalMs ?? 20_000;
    if (every <= 0) return;
    this.pingTimer = setInterval(() => {
      if (this.send('ping', {})) this.armPongTimeout(true);
    }, every);
  }

  private armPongTimeout(arm: boolean): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    if (!arm) return;
    this.pongTimer = setTimeout(() => {
      // No frame since the ping: assume the connection is dead.
      this.socket?.close(4000, 'pong timeout');
    }, this.opts.pongTimeoutMs ?? 10_000);
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.retryTimer = this.pingTimer = this.pongTimer = null;
  }

  private setStatus(status: ConnectionStatus, info: StatusInfo): void {
    this.status = status;
    this.opts.onStatus?.(status, info);
  }
}

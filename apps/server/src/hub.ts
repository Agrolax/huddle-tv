import {randomBytes, randomInt} from 'node:crypto';
import {
  ClientInfo,
  ClientMessage,
  DEFAULT_TOPICS,
  ErrorCode,
  FamilyMessage,
  HouseholdSnapshot,
  PAIR_CODE_TTL_MS,
  PairCode,
  ServerMessage,
  Topic,
  buildJoinUrl,
  canSend,
  envelope,
  generatePairCode,
  isClientMessageType,
  parseEnvelope,
  shouldDeliver,
  TonightMood,
  TonightPicks,
  Weather,
  applyDeviceSet,
  isId,
  pruneEvents,
  validateCalendarAdd,
  validateChatAsk,
  validateCalendarRemove,
  validateEmpty,
  validateHello,
  validateMessageSend,
  validateProfileSwitch,
  validateSmartHomeSet,
  validateSubscribe,
  validateTonightRequest,
} from '@huddle/shared';
import {ChatContext, ChatTurn, HouseholdAI, MockAI, Person} from './ai/index.js';
import {demoHousehold} from './household.js';

/** The parts of a `ws` WebSocket the hub uses. Tests can pass the real thing. */
export interface HubSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface HubOptions {
  /** Base URL of the phone companion; the QR encodes this + `?h=&c=`. */
  companionUrl: string;
  pairTtlMs?: number;
  now?: () => number;
  /** For the pair code alphabet; crypto-backed by default. */
  random?: () => number;
  log?: (msg: string, extra?: unknown) => void;
  /** Tonight picks and chat. Defaults to the mock. */
  ai?: HouseholdAI;
  /** Used when `ai` fails, so the demo never shows an error. Defaults to the mock. */
  fallbackAI?: HouseholdAI;
  tonightTimeoutMs?: number;
  chatTimeoutMs?: number;
}

interface Connection {
  id: number;
  socket: HubSocket;
  /** Set after a successful hello. */
  session: null | {
    householdId: string;
    client: ClientInfo;
    topics: Topic[];
  };
  /** Set while a chat answer streams to this client; aborted if it disconnects. */
  chat?: AbortController;
}

interface Household {
  snapshot: HouseholdSnapshot;
  /** Set when the first TV claims the household. Only its holder may connect as `tv` again. */
  tvToken: string | null;
  /** Live pair codes → expiry (ms). */
  pairCodes: Map<string, number>;
  /** Session tokens handed out in `welcome`, so phones can reconnect after their code expires. */
  tokens: Map<string, {role: ClientInfo['role']; clientId: string}>;
  tonightPending: boolean;
  /** `<clientId>:<conversationId>` → recent turns, so follow-up questions have context. */
  chats: Map<string, ChatTurn[]>;
}

type ServerPayloads = {[M in ServerMessage as M['type']]: M['payload']};

const OPEN = 1;
/** Close codes (4000–4999 are application-defined). */
export const CLOSE = {rejected: 4001, replaced: 4002} as const;
const MAX_FRAME_BYTES = 16 * 1024;
const CHAT_TURNS_KEPT = 12;
const CHATS_KEPT = 50;

export class Hub {
  private readonly households = new Map<string, Household>();
  private readonly connections = new Set<Connection>();
  private nextConnId = 1;
  private weather: Weather | null = null;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly pairTtlMs: number;
  private readonly log: NonNullable<HubOptions['log']>;
  private readonly ai: HouseholdAI;
  private readonly fallbackAI: HouseholdAI;

  constructor(private readonly opts: HubOptions) {
    this.now = opts.now ?? Date.now;
    this.random = opts.random ?? (() => randomInt(0, 2 ** 31) / 2 ** 31);
    this.pairTtlMs = opts.pairTtlMs ?? PAIR_CODE_TTL_MS;
    this.log = opts.log ?? (() => {});
    this.fallbackAI = opts.fallbackAI ?? new MockAI();
    this.ai = opts.ai ?? this.fallbackAI;
  }

  /** Register a socket. Returns the callbacks to wire to its `message` and `close` events. */
  connect(socket: HubSocket): {onMessage: (data: unknown) => void; onClose: () => void} {
    const conn: Connection = {id: this.nextConnId++, socket, session: null};
    this.connections.add(conn);
    return {
      onMessage: data => this.safeHandle(conn, data),
      onClose: () => this.disconnect(conn),
    };
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  /** New conditions from the weather poller: stored for new households and pushed to every live one. */
  setWeather(weather: Weather): void {
    this.weather = weather;
    for (const hh of this.households.values()) {
      hh.snapshot.weather = weather;
      this.broadcast(hh, 'weather:updated', weather);
    }
  }

  /** For tests and the health endpoint. */
  household(id: string): HouseholdSnapshot | undefined {
    return this.households.get(id)?.snapshot;
  }

  // -------------------------------------------------------------------------

  /** One bad frame must never take the process down. */
  private safeHandle(conn: Connection, data: unknown): void {
    let replyTo: string | undefined;
    try {
      const raw = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      if (raw.length > MAX_FRAME_BYTES) {
        this.error(conn, 'bad-request', `frame larger than ${MAX_FRAME_BYTES} bytes`);
        return;
      }
      const env = parseEnvelope(raw);
      if (!env) {
        this.error(conn, 'bad-request', 'not a Huddle envelope');
        return;
      }
      replyTo = env.id;
      if (!isClientMessageType(env.type)) {
        this.error(conn, 'bad-request', `unknown message type "${env.type}"`, replyTo);
        return;
      }
      this.handle(conn, env.type, env.payload, env.id);
    } catch (e) {
      this.log('handler crashed', e);
      this.error(conn, 'internal', 'server error', replyTo);
    }
  }

  private handle(conn: Connection, type: ClientMessage['type'], payload: unknown, frameId: string): void {
    if (type === 'hello') {
      this.hello(conn, payload, frameId);
      return;
    }
    const session = conn.session;
    if (!session) {
      this.error(conn, 'not-ready', 'send hello first', frameId);
      return;
    }
    if (!canSend(session.client.role, type)) {
      this.error(conn, 'forbidden', `${session.client.role} cannot send ${type}`, frameId);
      return;
    }
    const hh = this.households.get(session.householdId)!;

    switch (type) {
      case 'ping': {
        const v = validateEmpty(type, payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        this.send(conn, 'pong', {});
        return;
      }
      case 'subscribe': {
        const v = validateSubscribe(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        session.topics = v.value.topics;
        return;
      }
      case 'pair:request': {
        const v = validateEmpty(type, payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        this.send(conn, 'pair:code', this.issuePairCode(hh));
        return;
      }
      case 'profile:switch': {
        const v = validateProfileSwitch(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const unknown = this.unknownProfiles(hh, v.value.profileIds);
        if (unknown.length) return this.error(conn, 'bad-request', `unknown profile(s): ${unknown.join(', ')}`, frameId);
        hh.snapshot.activeProfileIds = v.value.profileIds;
        this.broadcast(hh, 'profile:changed', {profileIds: hh.snapshot.activeProfileIds});
        return;
      }
      case 'message:send': {
        const v = validateMessageSend(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const fromProfileId = v.value.fromProfileId ?? session.client.profileId;
        if (fromProfileId && !hh.snapshot.profiles.some(p => p.id === fromProfileId)) {
          return this.error(conn, 'bad-request', `unknown profile ${fromProfileId}`, frameId);
        }
        const message: FamilyMessage = {
          id: frameId,
          text: v.value.text,
          ...(fromProfileId ? {fromProfileId} : {}),
          fromClient: session.client.role,
          at: new Date(this.now()).toISOString(),
        };
        hh.snapshot.messages = [message, ...hh.snapshot.messages].slice(0, 50);
        this.broadcast(hh, 'message:new', message);
        return;
      }
      case 'calendar:add': {
        const v = validateCalendarAdd(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const unknown = this.unknownProfiles(hh, v.value.profileIds);
        if (unknown.length) return this.error(conn, 'bad-request', `unknown profile(s): ${unknown.join(', ')}`, frameId);
        hh.snapshot.events = pruneEvents([...hh.snapshot.events, {id: frameId, ...v.value}], this.now());
        this.broadcast(hh, 'calendar:updated', {events: hh.snapshot.events});
        return;
      }
      case 'calendar:remove': {
        const v = validateCalendarRemove(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const events = hh.snapshot.events.filter(e => e.id !== v.value.eventId);
        if (events.length === hh.snapshot.events.length) {
          return this.error(conn, 'bad-request', `unknown event ${v.value.eventId}`, frameId);
        }
        hh.snapshot.events = events;
        this.broadcast(hh, 'calendar:updated', {events});
        return;
      }
      case 'smart-home:set': {
        const v = validateSmartHomeSet(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const device = hh.snapshot.devices.find(d => d.id === v.value.deviceId);
        if (!device) return this.error(conn, 'bad-request', `unknown device ${v.value.deviceId}`, frameId);
        const next = applyDeviceSet(device, v.value);
        hh.snapshot.devices = hh.snapshot.devices.map(d => (d.id === device.id ? next : d));
        this.broadcast(hh, 'smart-home:state', {devices: hh.snapshot.devices});
        return;
      }
      case 'tonight:request': {
        const v = validateTonightRequest(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        // Whoever asked gets the picks with everyone else when they land.
        if (hh.tonightPending) return this.error(conn, 'busy', 'Tonight picks are already on their way', frameId);
        this.makeTonight(hh, v.value.mood).catch(e => this.log('tonight crashed', e));
        return;
      }
      case 'chat:ask': {
        const v = validateChatAsk(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        if (conn.chat) return this.error(conn, 'busy', 'wait for the current answer', frameId);
        const conversationId = v.value.conversationId ?? (isId(frameId) ? frameId : `c${conn.id}-${this.now().toString(36)}`);
        this.answer(conn, hh, conversationId, v.value.text).catch(e => this.log('chat crashed', e));
        return;
      }
      default:
        // Sketch it lands in step 5.
        this.error(conn, 'not-implemented', `${type} is not implemented yet`, frameId);
    }
  }

  private people(hh: Household, ids: readonly string[]): Person[] {
    return hh.snapshot.profiles.filter(p => ids.includes(p.id)).map(p => ({id: p.id, name: p.name}));
  }

  /** Ask the AI for picks for whoever is here, fall back to the mock on failure, and broadcast them. */
  private async makeTonight(hh: Household, mood: TonightMood | undefined): Promise<void> {
    hh.tonightPending = true;
    const forProfileIds = [...hh.snapshot.activeProfileIds];
    const ctx = {people: this.people(hh, forProfileIds), ...(mood ? {mood} : {}), now: new Date(this.now())};
    let source = this.ai.source;
    let picks;
    try {
      picks = await this.ai.tonight(ctx, AbortSignal.timeout(this.opts.tonightTimeoutMs ?? 10_000));
    } catch (e) {
      this.log(`tonight via ${this.ai.source} failed, using the mock`, errorText(e));
      source = 'mock';
      picks = await this.fallbackAI.tonight(ctx);
    } finally {
      hh.tonightPending = false;
    }
    const result: TonightPicks = {picks, ...(mood ? {mood} : {}), forProfileIds, at: new Date(this.now()).toISOString(), source};
    hh.snapshot.tonight = result;
    this.broadcast(hh, 'tonight:picks', result);
  }

  /** Stream an answer to the asking client only, then `done`. */
  private async answer(conn: Connection, hh: Household, conversationId: string, text: string): Promise<void> {
    const session = conn.session!;
    const key = `${session.client.clientId}:${conversationId}`;
    const turns: ChatTurn[] = [...(hh.chats.get(key) ?? []), {role: 'user', text}];
    const askedBy = session.client.profileId ? this.people(hh, [session.client.profileId])[0] : undefined;
    const ctx: ChatContext = {
      householdName: hh.snapshot.name,
      people: this.people(hh, hh.snapshot.activeProfileIds),
      ...(askedBy ? {askedBy} : {}),
      events: hh.snapshot.events,
      devices: hh.snapshot.devices,
      weather: hh.snapshot.weather,
      now: new Date(this.now()),
      turns,
    };
    const controller = new AbortController();
    conn.chat = controller;
    const timer = setTimeout(() => controller.abort(), this.opts.chatTimeoutMs ?? 25_000);
    let reply = '';
    const pipe = async (chunks: AsyncIterable<string>) => {
      for await (const chunk of chunks) {
        if (controller.signal.aborted) break;
        reply += chunk;
        this.send(conn, 'chat:reply', {conversationId, text: chunk, done: false});
      }
    };
    try {
      await pipe(this.ai.chat(ctx, controller.signal));
    } catch (e) {
      this.log(`chat via ${this.ai.source} failed`, errorText(e));
      try {
        if (!reply && !controller.signal.aborted && this.ai !== this.fallbackAI) {
          await pipe(this.fallbackAI.chat(ctx, controller.signal));
        } else {
          const sorry = reply ? ' … sorry, I lost my train of thought.' : "Sorry, I couldn't answer that. Try again?";
          reply += sorry;
          this.send(conn, 'chat:reply', {conversationId, text: sorry, done: false});
        }
      } catch (e2) {
        this.log('chat fallback failed', errorText(e2));
      }
    } finally {
      clearTimeout(timer);
      conn.chat = undefined;
    }
    this.send(conn, 'chat:reply', {conversationId, text: '', done: true});
    hh.chats.delete(key);
    hh.chats.set(key, [...turns, {role: 'assistant' as const, text: reply}].slice(-CHAT_TURNS_KEPT));
    // Maps keep insertion order, so the first key is the least recently used conversation.
    if (hh.chats.size > CHATS_KEPT) hh.chats.delete(hh.chats.keys().next().value!);
  }

  private unknownProfiles(hh: Household, ids: readonly string[]): string[] {
    const known = new Set(hh.snapshot.profiles.map(p => p.id));
    return ids.filter(id => !known.has(id));
  }

  private hello(conn: Connection, payload: unknown, frameId: string): void {
    if (conn.session) return this.error(conn, 'bad-request', 'already said hello', frameId);
    const v = validateHello(payload);
    if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
    const {householdId, client, topics, pairCode, token} = v.value;

    let hh = this.households.get(householdId);

    if (client.role === 'tv') {
      if (!hh) {
        hh = this.createHousehold(householdId);
      }
      if (hh.tvToken && token !== hh.tvToken) {
        return this.reject(conn, 'tv-claimed', 'another TV owns this household', frameId);
      }
      if (!hh.tvToken) hh.tvToken = this.newToken();
      // A reconnecting TV replaces its old socket, if that is still around.
      for (const other of this.connections) {
        if (other !== conn && other.session?.householdId === householdId && other.session.client.role === 'tv') {
          other.socket.close(CLOSE.replaced, 'replaced by a newer TV connection');
          this.disconnect(other);
        }
      }
      this.join(conn, hh, client, topics, hh.tvToken);
      return;
    }

    // Phones, displays, voice: need an existing household plus a token or a live pair code.
    if (!hh) return this.reject(conn, 'pair-code-invalid', 'unknown household or pair code', frameId);
    const tokenEntry = token ? hh.tokens.get(token) : undefined;
    if (tokenEntry && tokenEntry.role === client.role) {
      this.join(conn, hh, client, topics, token!);
      return;
    }
    if (!pairCode) return this.reject(conn, 'pairing-required', 'scan the QR code on the TV', frameId);
    this.prunePairCodes(hh);
    const expiresAt = hh.pairCodes.get(pairCode);
    if (expiresAt === undefined) {
      return this.reject(conn, 'pair-code-invalid', 'that code is not valid for this household', frameId);
    }
    if (expiresAt <= this.now()) {
      return this.reject(conn, 'pair-code-expired', 'that code has expired, scan the QR code again', frameId);
    }
    const newToken = this.newToken();
    hh.tokens.set(newToken, {role: client.role, clientId: client.clientId});
    this.join(conn, hh, client, topics, newToken);
  }

  private join(conn: Connection, hh: Household, client: ClientInfo, topics: Topic[], token: string): void {
    conn.session = {
      householdId: hh.snapshot.householdId,
      client,
      topics: topics.length ? topics : [...DEFAULT_TOPICS[client.role]],
    };
    hh.snapshot.clients = [...hh.snapshot.clients.filter(c => c.clientId !== client.clientId), client];
    this.send(conn, 'welcome', {snapshot: hh.snapshot, you: client, token});
    this.broadcast(hh, 'client:joined', client, conn);
    this.log(`${client.role} ${client.clientId} joined ${hh.snapshot.householdId}`);
  }

  private disconnect(conn: Connection): void {
    if (!this.connections.delete(conn)) return;
    conn.chat?.abort();
    const session = conn.session;
    if (!session) return;
    const hh = this.households.get(session.householdId);
    if (!hh) return;
    const stillHere = [...this.connections].some(
      c => c.session?.householdId === session.householdId && c.session.client.clientId === session.client.clientId,
    );
    if (stillHere) return;
    hh.snapshot.clients = hh.snapshot.clients.filter(c => c.clientId !== session.client.clientId);
    this.broadcast(hh, 'client:left', {clientId: session.client.clientId});
  }

  private createHousehold(id: string): Household {
    const hh: Household = {
      snapshot: demoHousehold(id, this.now(), this.weather),
      tvToken: null,
      pairCodes: new Map(),
      tokens: new Map(),
      tonightPending: false,
      chats: new Map(),
    };
    this.households.set(id, hh);
    return hh;
  }

  private issuePairCode(hh: Household): PairCode {
    this.prunePairCodes(hh);
    let code = generatePairCode(this.random);
    while (hh.pairCodes.has(code)) code = generatePairCode(this.random);
    const expiresAt = this.now() + this.pairTtlMs;
    hh.pairCodes.set(code, expiresAt);
    return {code, expiresAt, joinUrl: buildJoinUrl(this.opts.companionUrl, hh.snapshot.householdId, code)};
  }

  private prunePairCodes(hh: Household): void {
    // Keep expired codes for a while so a late scan gets "expired" rather than "invalid".
    const cutoff = this.now() - this.pairTtlMs;
    for (const [code, expiresAt] of hh.pairCodes) if (expiresAt < cutoff) hh.pairCodes.delete(code);
  }

  private newToken(): string {
    return randomBytes(18).toString('base64url');
  }

  private broadcast<T extends ServerMessage['type']>(
    hh: Household,
    type: T,
    payload: ServerPayloads[T],
    except?: Connection,
  ): void {
    for (const conn of this.connections) {
      if (conn === except || conn.session?.householdId !== hh.snapshot.householdId) continue;
      if (shouldDeliver(type, conn.session.topics)) this.send(conn, type, payload);
    }
  }

  private send<T extends ServerMessage['type']>(conn: Connection, type: T, payload: ServerPayloads[T]): void {
    if (conn.socket.readyState !== OPEN) return;
    try {
      conn.socket.send(JSON.stringify(envelope<ServerMessage>(type, payload as ServerMessage['payload'])));
    } catch (e) {
      this.log('send failed', e);
    }
  }

  private error(conn: Connection, code: ErrorCode, message: string, replyTo?: string): void {
    this.send(conn, 'error', {code, message, ...(replyTo ? {replyTo} : {})});
  }

  /** Error, then close: the client can't continue on this socket. */
  private reject(conn: Connection, code: ErrorCode, message: string, replyTo: string): void {
    this.error(conn, code, message, replyTo);
    conn.socket.close(CLOSE.rejected, code);
    this.connections.delete(conn);
  }
}

function errorText(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

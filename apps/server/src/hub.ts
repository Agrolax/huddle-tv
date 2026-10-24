import {randomBytes, randomInt} from 'node:crypto';
import {
  ClientInfo,
  ClientMessage,
  DEFAULT_TOPICS,
  ErrorCode,
  FamilyMessage,
  GameState,
  HouseholdSnapshot,
  PAIR_CODE_TTL_MS,
  PairCode,
  Profile,
  ServerMessage,
  Topic,
  buildJoinUrl,
  canSend,
  envelope,
  generatePairCode,
  isClientMessageType,
  parseEnvelope,
  shouldDeliver,
  QuizSource,
  TonightMood,
  TonightPicks,
  Weather,
  addToLeague,
  applyDeviceSet,
  gameIsLive,
  isId,
  pruneEvents,
  validateCalendarAdd,
  validateChatAsk,
  validateCalendarRemove,
  validateDoorSimulate,
  validateSketchClear,
  validateSketchGuess,
  validateSketchStroke,
  validateTonightVote,
  validateVoteRef,
  validateGameAnswer,
  validateGameRef,
  validateGameStart,
  validateEmpty,
  validateHello,
  validateMessageSend,
  validateProfileSave,
  validateProfileSwitch,
  validateSmartHomeSet,
  validateSubscribe,
  validateTonightRequest,
} from '@huddle/shared';
import {ChatContext, ChatTurn, HouseholdAI, MockAI, Person, mockTonight} from './ai/index.js';
import {minutesUntil} from './ai/types.js';
import type {ArtStore} from './art.js';
import {demoHousehold} from './household.js';
import {QuizEngine} from './quiz/engine.js';
import {SketchEngine} from './sketch/engine.js';
import type {PosterLookup} from './posters/tmdb.js';
import {endsByOf, fitPicks, tonightLimit} from './tonight/bedtime.js';
import {VoteEngine} from './tonight/vote.js';
import {ourWeekQuestions} from './quiz/ourWeek.js';
import {QuizItem, shuffleChoices} from './quiz/questions.js';

/** The parts of a `ws` WebSocket the hub uses. Tests can pass the real thing. */
export interface HubSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface HubOptions {
  /** Base URL of the phone companion; the QR encodes this + `?h=&c=`. */
  companionUrl: string;
  /** Who a new household starts with. Defaults to the demo family. */
  people?: Profile[];
  pairTtlMs?: number;
  now?: () => number;
  /** For the pair code alphabet; crypto-backed by default. */
  random?: () => number;
  log?: (msg: string, extra?: unknown) => void;
  /** Tonight picks and chat. Defaults to the mock. */
  ai?: HouseholdAI;
  /** Used when `ai` fails, so the demo never shows an error. Defaults to the mock. */
  fallbackAI?: HouseholdAI;
  /** Optional TMDB posters. Unset leaves the text cards. */
  posters?: PosterLookup;
  tonightTimeoutMs?: number;
  /** Paints Tonight backdrops (Nova Canvas). Without it, the TV draws its own. */
  art?: ArtStore;
  chatTimeoutMs?: number;
  /** Game night timing; tests make these short. */
  quizQuestionMs?: number;
  quizRevealMs?: number;
  quizTimeoutMs?: number;
  sketchDrawMs?: number;
  sketchRevealMs?: number;
  voteMs?: number;
  suddenDeathMs?: number;
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
  /** Sketch the pick is waiting for Tonight picks to use as prompts. */
  sketchPending: boolean;
  /** `<clientId>:<conversationId>` → recent turns, so follow-up questions have context. */
  chats: Map<string, ChatTurn[]>;
  quiz: QuizEngine;
  sketch: SketchEngine;
  vote: VoteEngine;
}

type ServerPayloads = {[M in ServerMessage as M['type']]: M['payload']};

const OPEN = 1;
/** Close codes (4000–4999 are application-defined). */
export const CLOSE = {rejected: 4001, replaced: 4002} as const;
const MAX_FRAME_BYTES = 16 * 1024;
const CHAT_TURNS_KEPT = 12;
const CHATS_KEPT = 50;
const MAX_PROFILES = 12;

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
  private readonly posters: PosterLookup | null;

  constructor(private readonly opts: HubOptions) {
    this.now = opts.now ?? Date.now;
    this.random = opts.random ?? (() => randomInt(0, 2 ** 31) / 2 ** 31);
    this.pairTtlMs = opts.pairTtlMs ?? PAIR_CODE_TTL_MS;
    this.log = opts.log ?? (() => {});
    this.fallbackAI = opts.fallbackAI ?? new MockAI();
    this.ai = opts.ai ?? this.fallbackAI;
    this.posters = opts.posters ?? null;
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
      case 'profile:save': {
        const v = validateProfileSave(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const {profileId, ...fields} = v.value;
        const profiles = hh.snapshot.profiles;
        if (profileId && !profiles.some(p => p.id === profileId)) return this.error(conn, 'bad-request', `unknown profile ${profileId}`, frameId);
        if (!profileId && profiles.length >= MAX_PROFILES) return this.error(conn, 'bad-request', `a household has at most ${MAX_PROFILES} people`, frameId);
        const id = profileId ?? this.newProfileId(hh, fields.name);
        hh.snapshot.profiles = profileId
          ? profiles.map(p => (p.id === id ? {...p, ...fields} : p))
          : [...profiles.filter(p => p.id !== 'guest'), {id, ...fields}, ...profiles.filter(p => p.id === 'guest')];
        this.broadcast(hh, 'profiles:updated', {profiles: hh.snapshot.profiles, savedId: id});
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
      case 'door:simulate': {
        const v = validateDoorSimulate(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        this.broadcast(hh, 'door:event', {
          id: frameId,
          kind: v.value.kind ?? 'ring',
          camera: 'Front door',
          at: new Date(this.now()).toISOString(),
          source: 'demo',
        });
        return;
      }
      case 'game:start': {
        const v = validateGameStart(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        if (gameIsLive(hh.snapshot.game) || hh.sketchPending) return this.error(conn, 'busy', 'a game is already running', frameId);
        if (v.value.kind === 'quiz') {
          this.startQuiz(hh, v.value.source, v.value.title).catch(e => this.log('quiz crashed', e));
          return;
        }
        const drawers = this.answerers(hh.snapshot.householdId);
        if (drawers.length < 2) return this.error(conn, 'bad-request', 'Sketch the pick needs two phones', frameId);
        this.startSketch(hh, drawers).catch(e => this.log('sketch crashed', e));
        return;
      }
      case 'game:answer': {
        const v = validateGameAnswer(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const profileId = v.value.profileId ?? session.client.profileId;
        if (!profileId) return this.error(conn, 'bad-request', 'select who you are before you answer', frameId);
        if (this.unknownProfiles(hh, [profileId]).length) return this.error(conn, 'bad-request', `unknown profile ${profileId}`, frameId);
        const result = hh.quiz.answer(v.value.gameId, v.value.round, profileId, v.value.choice);
        if (result === 'stale' || result === 'closed') return this.error(conn, 'bad-request', 'that question is closed', frameId);
        if (result === 'already') return this.error(conn, 'bad-request', 'already answered', frameId);
        return;
      }
      case 'game:next':
      case 'game:end': {
        const v = validateGameRef(type, payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const engine = hh.snapshot.game.kind === 'sketch' ? hh.sketch : hh.quiz;
        const done = type === 'game:next' ? engine.next(v.value.gameId) : engine.end(v.value.gameId);
        if (!done) return this.error(conn, 'bad-request', 'no such game step', frameId);
        return;
      }
      case 'sketch:stroke': {
        const v = validateSketchStroke(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const result = hh.sketch.stroke(v.value.gameId, v.value.round, session.client.profileId ?? '', v.value.stroke);
        if (result !== 'ok') return this.sketchError(conn, result, frameId);
        hh.snapshot.sketch = hh.sketch.canvas;
        this.broadcast(hh, 'sketch:stroke', v.value, conn);
        return;
      }
      case 'sketch:clear': {
        const v = validateSketchClear(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const result = hh.sketch.clear(v.value.gameId, v.value.round, session.client.profileId ?? '');
        if (result !== 'ok') return this.sketchError(conn, result, frameId);
        hh.snapshot.sketch = hh.sketch.canvas;
        this.broadcast(hh, 'sketch:clear', v.value, conn);
        return;
      }
      case 'sketch:guess': {
        const v = validateSketchGuess(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const me = session.client.profileId;
        if (!me) return this.error(conn, 'bad-request', 'select who you are before you guess', frameId);
        const {gameId, round, text} = v.value;
        const g = hh.sketch.guess(gameId, round, me, text);
        if (g.result === 'stale' || g.result === 'closed') return this.error(conn, 'bad-request', 'that round is over', frameId);
        if (g.result === 'drawer') return this.error(conn, 'forbidden', 'the drawer cannot guess', frameId);
        if (g.result !== 'ok') return this.error(conn, 'bad-request', 'you already got it', frameId);
        this.broadcast(hh, 'sketch:guess', {gameId, round, profileId: me, ...(g.correct ? {} : {text}), correct: g.correct});
        hh.sketch.settle();
        return;
      }
      case 'tonight:vote-start': {
        const v = validateEmpty(type, payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const picks = hh.snapshot.tonight?.picks ?? [];
        if (picks.length < 2) return this.error(conn, 'bad-request', 'get Tonight picks before you vote', frameId);
        if (hh.tonightPending) return this.error(conn, 'busy', 'Tonight picks are on their way', frameId);
        hh.vote.start(this.newGameId('v'), picks.length);
        return;
      }
      case 'tonight:vote': {
        const v = validateTonightVote(payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const profileId = v.value.profileId ?? session.client.profileId;
        if (!profileId) return this.error(conn, 'bad-request', 'select who you are before you vote', frameId);
        if (this.unknownProfiles(hh, [profileId]).length) return this.error(conn, 'bad-request', `unknown profile ${profileId}`, frameId);
        const result = hh.vote.vote(v.value.voteId, profileId, v.value.yes);
        if (result === 'stale' || result === 'closed') return this.error(conn, 'bad-request', 'that vote is closed', frameId);
        if (result === 'already') return this.error(conn, 'bad-request', 'already voted', frameId);
        if (result === 'invalid') return this.error(conn, 'bad-request', 'vote for the picks shown', frameId);
        return;
      }
      case 'tonight:vote-next':
      case 'tonight:vote-end': {
        const v = validateVoteRef(type, payload);
        if (!v.ok) return this.error(conn, 'bad-request', v.error, frameId);
        const done = type === 'tonight:vote-next' ? hh.vote.next(v.value.voteId) : hh.vote.end(v.value.voteId);
        if (!done) return this.error(conn, 'bad-request', 'no such vote step', frameId);
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
        this.error(conn, 'not-implemented', `${type} is not implemented yet`, frameId);
    }
  }

  private sketchError(conn: Connection, result: 'stale' | 'not-drawer' | 'full', frameId: string): void {
    if (result === 'stale') return this.error(conn, 'bad-request', 'that round is over', frameId);
    if (result === 'not-drawer') return this.error(conn, 'forbidden', 'only the drawer can draw', frameId);
    this.error(conn, 'bad-request', 'the drawing is full; clear it to go on', frameId);
  }

  private people(hh: Household, ids: readonly string[]): Person[] {
    return hh.snapshot.profiles.filter(p => ids.includes(p.id)).map(p => ({id: p.id, name: p.name, ...(p.kid ? {kid: true} : {})}));
  }

  /**
   * Ask the AI for picks for whoever is here, fall back to the mock on failure,
   * drop picks that run past bedtime, attach posters when TMDB is configured,
   * and broadcast them. A vote on the old picks ends. `tonightPending` stays
   * set through the poster lookup so a second request gets `busy`.
   */
  private async makeTonight(hh: Household, mood: TonightMood | undefined): Promise<void> {
    hh.tonightPending = true;
    hh.vote.reset();
    try {
      const forProfileIds = [...hh.snapshot.activeProfileIds];
      const now = new Date(this.now());
      const limit = tonightLimit(hh.snapshot.profiles, forProfileIds, hh.snapshot.events, now);
      const ctx = {people: this.people(hh, forProfileIds), ...(mood ? {mood} : {}), now, ...(limit ? {endsBy: limit} : {})};
      let source = this.ai.source;
      let picks;
      try {
        picks = await this.ai.tonight(ctx, AbortSignal.timeout(this.opts.tonightTimeoutMs ?? 10_000));
      } catch (e) {
        this.log(`tonight via ${this.ai.source} failed, using the mock`, errorText(e));
        source = 'mock';
        picks = await this.fallbackAI.tonight(ctx);
      }
      if (limit) {
        const max = minutesUntil(limit.at, now);
        picks = fitPicks(picks, mockTonight(ctx.people, mood, max), max);
      }
      if (this.posters) {
        try {
          picks = await this.posters.attach(picks);
        } catch (e) {
          this.log('poster lookup failed', errorText(e));
        }
      }
      const result: TonightPicks = {
        picks,
        ...(mood ? {mood} : {}),
        forProfileIds,
        at: new Date(this.now()).toISOString(),
        source,
        ...(limit ? {endsBy: endsByOf(limit)} : {}),
      };
      hh.snapshot.tonight = result;
      this.broadcast(hh, 'tonight:picks', result);
      void this.paintTonight(hh, result.at);
    } finally {
      hh.tonightPending = false;
    }
  }

  /** Backdrops come after the picks: each one is broadcast as soon as it is painted, if those picks are still up. */
  private async paintTonight(hh: Household, at: string): Promise<void> {
    const art = this.opts.art;
    const picks = hh.snapshot.tonight?.picks;
    if (!art || !picks) return;
    await Promise.all(
      picks.map(async pick => {
        const image = await art.ensure(pick);
        const current = hh.snapshot.tonight;
        if (!image || current?.at !== at) return;
        hh.snapshot.tonight = {...current, picks: current.picks.map(p => (p.title === pick.title ? {...p, image} : p))};
        this.broadcast(hh, 'tonight:picks', hh.snapshot.tonight);
      }),
    );
  }

  private newGameId(prefix = 'g'): string {
    return `${prefix}${this.now().toString(36)}${Math.floor(this.random() * 1e6).toString(36)}`;
  }

  /** Show "writing questions", gather them (household data or the AI), then run the rounds. */
  private async startQuiz(hh: Household, source: QuizSource, requestedTitle?: string): Promise<void> {
    const gameId = this.newGameId();
    const now = new Date(this.now());
    if (source === 'our-week') {
      hh.quiz.begin(gameId, source, 'Our Week');
      const items = ourWeekQuestions(hh.snapshot, now, this.random).map(i => shuffleChoices(i, this.random));
      hh.quiz.load(gameId, items, 'Our Week', 'mock');
      return;
    }
    const tonight = hh.snapshot.tonight;
    const title = requestedTitle ?? tonight?.picks[tonight.chosen ?? 0]?.title ?? 'Paddington 2';
    hh.quiz.begin(gameId, source, `Watched It: ${title}`);
    const ctx = {title, people: this.people(hh, hh.snapshot.activeProfileIds), now};
    let aiSource = this.ai.source;
    let result;
    try {
      result = await this.ai.quiz(ctx, AbortSignal.timeout(this.opts.quizTimeoutMs ?? 12_000));
    } catch (e) {
      this.log(`quiz via ${this.ai.source} failed, using the mock`, errorText(e));
      aiSource = 'mock';
      result = await this.fallbackAI.quiz(ctx);
    }
    const items: QuizItem[] = result.items.map(i => shuffleChoices(i, this.random));
    hh.quiz.load(gameId, items, `Watched It: ${result.title}`, aiSource);
  }

  /** Draw tonight's candidates, one round each; picks are made first if there are none. */
  private async startSketch(hh: Household, drawers: string[]): Promise<void> {
    hh.sketchPending = true;
    try {
      if (!hh.snapshot.tonight || hh.snapshot.tonight.picks.length < 2) await this.makeTonight(hh, undefined);
    } finally {
      hh.sketchPending = false;
    }
    if (gameIsLive(hh.snapshot.game)) return;
    const prompts = hh.snapshot.tonight!.picks.map(p => p.title);
    // The person on the couch longest draws first: profile order.
    const order = hh.snapshot.profiles.map(p => p.id).filter(id => drawers.includes(id));
    hh.sketch.begin(this.newGameId(), prompts, order);
  }

  /** The last movie drawn becomes the pick for tonight. */
  private sketchDecided(hh: Household, title: string | undefined): void {
    const tonight = hh.snapshot.tonight;
    const index = tonight?.picks.findIndex(p => p.title === title) ?? -1;
    if (!tonight || index < 0) return;
    hh.snapshot.tonight = {...tonight, chosen: index};
    this.broadcast(hh, 'tonight:picks', hh.snapshot.tonight);
  }

  /** Profiles with a phone in the room: who the quiz waits for. */
  private answerers(householdId: string): string[] {
    const ids = new Set<string>();
    for (const c of this.connections) {
      const s = c.session;
      if (s?.householdId === householdId && s.client.role === 'phone' && s.client.profileId) ids.add(s.client.profileId);
    }
    return [...ids];
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
      everyone: this.people(hh, hh.snapshot.profiles.map(p => p.id)),
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

  /** "Grandma Jo" → "grandma-jo", with a number when that is taken. */
  private newProfileId(hh: Household, name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'person';
    const taken = new Set(hh.snapshot.profiles.map(p => p.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
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
    // A drawer whose phone reconnects mid-round needs the title again.
    const game = hh.snapshot.game;
    const prompt = hh.sketch.prompt;
    if (client.role === 'phone' && game.kind === 'sketch' && prompt && client.profileId === game.drawerId) {
      this.send(conn, 'sketch:prompt', {gameId: game.gameId!, round: game.round, prompt});
    }
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
    const finishGame = (state: GameState) => {
      hh.snapshot.league = addToLeague(hh.snapshot.league, state);
      this.broadcast(hh, 'league:updated', hh.snapshot.league);
    };
    const hh: Household = {
      snapshot: demoHousehold(id, this.now(), this.weather, this.opts.people),
      tvToken: null,
      pairCodes: new Map(),
      tokens: new Map(),
      tonightPending: false,
      sketchPending: false,
      chats: new Map(),
      quiz: new QuizEngine({
        now: this.now,
        questionMs: this.opts.quizQuestionMs ?? 20_000,
        revealMs: this.opts.quizRevealMs ?? 7_000,
        answerers: () => this.answerers(id),
        onState: state => {
          hh.snapshot.game = state;
          this.broadcast(hh, 'game:state', state);
        },
        onFinish: finishGame,
      }),
      sketch: new SketchEngine({
        now: this.now,
        drawMs: this.opts.sketchDrawMs ?? 75_000,
        revealMs: this.opts.sketchRevealMs ?? 6_000,
        players: () => this.answerers(id),
        onState: state => {
          hh.snapshot.game = state;
          hh.snapshot.sketch = hh.sketch.canvas;
          this.broadcast(hh, 'game:state', state);
        },
        onPrompt: (drawerId, gameId, round, prompt) => {
          for (const c of this.connections) {
            const s = c.session;
            if (s?.householdId === id && s.client.role === 'phone' && s.client.profileId === drawerId) this.send(c, 'sketch:prompt', {gameId, round, prompt});
          }
        },
        onFinish: state => {
          finishGame(state);
          this.sketchDecided(hh, state.answer);
        },
      }),
      vote: new VoteEngine({
        now: this.now,
        votingMs: this.opts.voteMs ?? 60_000,
        suddenDeathMs: this.opts.suddenDeathMs ?? 20_000,
        voters: () => this.answerers(id),
        onState: vote => {
          hh.snapshot.vote = vote;
          this.broadcast(hh, 'tonight:vote-state', vote);
        },
        onDecided: winner => {
          const tonight = hh.snapshot.tonight;
          if (!tonight || winner === undefined) return;
          hh.snapshot.tonight = {...tonight, chosen: winner};
          this.broadcast(hh, 'tonight:picks', hh.snapshot.tonight);
        },
      }),
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

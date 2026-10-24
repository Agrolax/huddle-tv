/**
 * Realtime protocol between apps/server and every client.
 *
 * One WebSocket per client, one household per socket. Every frame is an
 * `Envelope`. Clients announce a `role` and the `topics` they want, so a new
 * kind of screen (Echo Show web view, a tablet on the fridge, a second TV) can
 * join later by saying `role: 'display'` and subscribing to the topics it can
 * render, without the server or the other clients changing.
 */

export const PROTOCOL_VERSION = 1 as const;

/**
 * - `tv`: the Fire TV (Vega) app. Owns the room's "who's here" state.
 * - `phone`: the companion web app opened from the QR code. Input device.
 * - `display`: a read-mostly second screen (Echo Show, tablet). Renders topics.
 * - `voice`: a voice-only client (Alexa skill backend). Sends commands, no UI.
 */
export type ClientRole = 'tv' | 'phone' | 'display' | 'voice';

/** Groups of server pushes. A client only receives the topics it subscribed to. */
export type Topic =
  | 'household' // profiles, active profile, members present
  | 'calendar' // family calendar events
  | 'messages' // phone → TV messages / board
  | 'chat' // AI chat replies
  | 'tonight' // Bedrock picks
  | 'sketch' // Sketch the pick: strokes, guesses, the drawer's prompt
  | 'game' // game night: quiz rounds, answers, the family league
  | 'smart-home' // simulated devices
  | 'weather' // current conditions for the household's place
  | 'door'; // doorbell rings and motion at the door (simulated or Ring)

export const ALL_TOPICS: readonly Topic[] = [
  'household',
  'calendar',
  'messages',
  'chat',
  'tonight',
  'sketch',
  'game',
  'smart-home',
  'weather',
  'door',
];

/** What a client can do. Lets the server pick who gets a stroke stream or a TTS clip. */
export interface ClientCapabilities {
  /** Can render the full sketch canvas (TV, Echo Show). */
  canvas?: boolean;
  /** Can play audio URLs (Polly clips). */
  audio?: boolean;
  /** Can capture touch strokes (phone drawer). */
  touch?: boolean;
  /** Has a keyboard / text input. */
  text?: boolean;
  /** Approximate screen size class. Voice clients omit it. */
  screen?: 'tv' | 'tablet' | 'phone' | 'smart-display';
}

export interface ClientInfo {
  clientId: string;
  role: ClientRole;
  /** Shown in "connected devices" lists, e.g. "Kitchen Echo Show". */
  label?: string;
  /** Profile that is driving this client (phones). */
  profileId?: string;
}

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  /** A child: Tonight ends by their bedtime when they are here. */
  kid?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601 */
  start: string;
  end?: string;
  profileIds: string[];
}

export interface FamilyMessage {
  id: string;
  text: string;
  fromProfileId?: string;
  fromClient: ClientRole;
  /** ISO 8601 */
  at: string;
}

export interface TonightPick {
  title: string;
  year?: number;
  why: string;
  service?: string;
  deepLink?: string;
  /** Running time (one episode for a series). */
  minutes?: number;
  /**
   * Poster image, when the server could look one up (TMDB).
   * Missing when there is no key, no match, or the lookup failed.
   */
  posterUrl?: string;
}

/** Required wherever TMDB artwork is shown. https://www.themoviedb.org/about/logos-attribution */
export const TMDB_ATTRIBUTION = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';

/** Why tonight has a finish time: a child's bedtime or an early start tomorrow. */
export interface EndsBy {
  /** ISO 8601 */
  at: string;
  /** "8:30", in the server's local time (the TV's clock may be UTC). */
  label: string;
  /** "Rafi's bedtime", "Dentist at 8:00 tomorrow". */
  reason: string;
}

export type TonightMood = 'cozy' | 'funny' | 'edge-of-seat';

/** The moods the TV sheet and the phone offer, in display order. */
export const TONIGHT_MOODS: readonly {id: TonightMood; label: string}[] = [
  {id: 'cozy', label: 'Cozy'},
  {id: 'funny', label: 'Funny'},
  {id: 'edge-of-seat', label: 'Edge-of-seat'},
];

/** The latest Tonight picks for a household. Kept in the snapshot so the tile survives a reconnect. */
export interface TonightPicks {
  picks: TonightPick[];
  mood?: TonightMood;
  /** Who was here when the picks were made. */
  forProfileIds: string[];
  /** ISO 8601 */
  at: string;
  /** `mock` when HUDDLE_AI=mock or Bedrock failed and the server fell back. */
  source: 'bedrock' | 'mock';
  /** Set when tonight has to finish by a time; picks that run past it were dropped. */
  endsBy?: EndsBy;
  /** Index into `picks` of what the family decided on (secret veto or Sketch the pick). */
  chosen?: number;
}

/**
 * Secret veto: every phone says yes or no to each pick in private. The TV
 * only learns who has voted, then which picks everyone accepted.
 * idle → voting → (sudden-death when nothing is accepted by all) → result.
 */
export type VotePhase = 'idle' | 'voting' | 'sudden-death' | 'result';

export interface TonightVote {
  voteId: string | null;
  phase: VotePhase;
  /** Indexes into `tonight.picks` being voted on: all of them, then the top two in sudden death. */
  options: number[];
  /** Profiles that voted in this phase (never how). */
  voted: string[];
  /** ISO 8601 end of the current phase. */
  endsAt?: string;
  /** Result: picks every voter said yes to. */
  accepted?: number[];
  /** Result: the pick for tonight; missing when nobody voted. */
  winner?: number;
  decidedBy?: 'everyone' | 'sudden-death' | 'nobody';
}

export const IDLE_VOTE: TonightVote = {voteId: null, phase: 'idle', options: [], voted: []};

export interface Point {
  /** 0..1, relative to the drawer's canvas so every screen can scale it. */
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  color: string;
  /** Relative to canvas width (0..1). */
  width: number;
  points: Point[];
}

/** The drawing for the current Sketch the pick round, so a screen that joins late can redraw it. */
export interface SketchCanvas {
  gameId: string | null;
  round: number;
  strokes: Stroke[];
}

export const EMPTY_CANVAS: SketchCanvas = {gameId: null, round: 0, strokes: []};

/** Pens on the drawer's phone. */
export const SKETCH_COLORS: readonly string[] = ['#F4F1EA', '#3D8BFF', '#F5A524', '#E85D5D', '#3DCF8E'];

/** Where quiz questions come from. */
export type QuizSource = 'watched-it' | 'our-week';

export const QUIZ_SOURCES: readonly {id: QuizSource; label: string}[] = [
  {id: 'our-week', label: 'Our Week'},
  {id: 'watched-it', label: 'Watched It'},
];

export const QUIZ_CHOICES = 4;
export const QUIZ_ROUNDS = 5;

/** A question as players see it. The answer stays on the server until the reveal. */
export interface QuizQuestion {
  id: string;
  text: string;
  /** Exactly `QUIZ_CHOICES` short options, shown as A–D. */
  choices: string[];
}

/** idle → loading (writing questions) → question ⇄ reveal → final. */
export type GamePhase = 'idle' | 'loading' | 'question' | 'reveal' | 'final';

export type GameKind = 'quiz' | 'sketch';

/**
 * One game night game, as every screen sees it. Both games use the same
 * phases: in Sketch the pick a "question" is one drawing round.
 */
export interface GameState {
  gameId: string | null;
  phase: GamePhase;
  kind?: GameKind;
  source?: QuizSource;
  /** "Our Week" or "Watched It: Paddington 2". */
  title?: string;
  /** 1-based; 0 before the first question. */
  round: number;
  rounds: number;
  question?: QuizQuestion;
  /** ISO 8601 end of the current question or reveal. */
  endsAt?: string;
  /** Profiles that answered this question (not what they chose). */
  answered: string[];
  /** Set in `reveal`: index of the right choice. */
  correct?: number;
  /** Set in `reveal`: what each profile chose. */
  choices?: Record<string, number>;
  /** Set in `reveal`: points each profile won this question. */
  gained?: Record<string, number>;
  /** Points in this game so far. */
  scores: Record<string, number>;
  /** `mock` when the questions came from the fallback. */
  aiSource?: 'bedrock' | 'mock';
  /** Sketch: who draws this round. In `answered`: who guessed it so far. */
  drawerId?: string;
  /** Sketch: the title with letters hidden, "__________ 2". The drawer's phone gets the title in `sketch:prompt`. */
  hint?: string;
  /** Sketch, in `reveal`: the title that was drawn. */
  answer?: string;
}

/** Family league: totals that carry over from night to night. */
export interface LeagueEntry {
  points: number;
  /** Games this person won (ties count for everyone tied). */
  wins: number;
  games: number;
}

export type League = Record<string, LeagueEntry>;

export const IDLE_GAME: GameState = {gameId: null, phase: 'idle', round: 0, rounds: QUIZ_ROUNDS, answered: [], scores: {}};

export type SmartDeviceKind = 'light' | 'thermostat' | 'lock' | 'plug';

export interface SmartDevice {
  id: string;
  name: string;
  room: string;
  kind: SmartDeviceKind;
  on?: boolean;
  /** Thermostat target in °C, light brightness 0..100. */
  level?: number;
}

/** Current conditions from Open-Meteo, refreshed by the server. */
/** Someone at the door. From the demo button now; from a Ring webhook later. */
export interface DoorEvent {
  id: string;
  kind: 'ring' | 'motion';
  /** Camera or doorbell name, e.g. "Front door". */
  camera: string;
  /** ISO 8601 */
  at: string;
  /** `demo` for the phone button, `ring` for a Ring webhook. */
  source: 'demo' | 'ring';
  /** Still image from the camera, if the source has one. */
  snapshotUrl?: string;
}

export interface Weather {
  place: string;
  tempC: number;
  /** WMO weather interpretation code; `weatherSummary()` turns it into words. */
  code: number;
  highC?: number;
  lowC?: number;
  /** ISO 8601, when the server fetched it. */
  updatedAt: string;
}

export interface HouseholdSnapshot {
  householdId: string;
  name: string;
  profiles: Profile[];
  activeProfileIds: string[];
  events: CalendarEvent[];
  messages: FamilyMessage[];
  devices: SmartDevice[];
  /** `null` until the server's first fetch succeeds. */
  weather: Weather | null;
  /** `null` until someone asks for picks. */
  tonight: TonightPicks | null;
  vote: TonightVote;
  sketch: SketchCanvas;
  game: GameState;
  league: League;
  clients: ClientInfo[];
}

export interface PairCode {
  /** 6 characters from PAIR_CODE_ALPHABET. */
  code: string;
  /** ms since epoch. */
  expiresAt: number;
  /** Companion URL with `?h=<householdId>&c=<code>`; what the QR encodes. */
  joinUrl: string;
}

export type ErrorCode =
  | 'bad-request' // frame or payload has the wrong shape
  | 'not-ready' // sent something before `hello`
  | 'forbidden' // role may not send this type
  | 'pairing-required' // phone/display without a pair code or token
  | 'pair-code-invalid'
  | 'pair-code-expired'
  | 'tv-claimed' // another TV owns this household and no valid TV token was given
  | 'busy' // the same request is still running (a chat answer, Tonight picks)
  | 'not-implemented'
  | 'internal';

/** Errors after which the client should stop reconnecting and ask the user (rescan the QR). */
export const FATAL_ERRORS: readonly ErrorCode[] = ['pairing-required', 'pair-code-invalid', 'pair-code-expired', 'tv-claimed'];

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Client → server. */
export type ClientMessage =
  | {
      type: 'hello';
      payload: {
        householdId: string;
        client: ClientInfo;
        capabilities: ClientCapabilities;
        topics: Topic[];
        /** Pairing code from the QR. Phones and displays need this or a `token`. */
        pairCode?: string;
        /** Token from an earlier `welcome`. Lets a client reconnect after its pair code expired; a TV needs it to reclaim its household. */
        token?: string;
      };
    }
  | {type: 'pair:request'; payload: Record<string, never>}
  | {type: 'subscribe'; payload: {topics: Topic[]}}
  | {type: 'profile:switch'; payload: {profileIds: string[]}}
  | {type: 'message:send'; payload: {text: string; fromProfileId?: string}}
  | {type: 'calendar:add'; payload: {title: string; start: string; end?: string; profileIds: string[]}}
  | {type: 'calendar:remove'; payload: {eventId: string}}
  | {type: 'chat:ask'; payload: {text: string; conversationId?: string}}
  | {type: 'tonight:request'; payload: {mood?: TonightMood}}
  /** Secret veto on the current picks. */
  | {type: 'tonight:vote-start'; payload: Record<string, never>}
  /** `yes`: indexes of the options this person accepts. In sudden death, exactly one. `profileId` defaults to the phone's own person. */
  | {type: 'tonight:vote'; payload: {voteId: string; yes: number[]; profileId?: string}}
  /** Stop waiting and show the result now. */
  | {type: 'tonight:vote-next'; payload: {voteId: string}}
  | {type: 'tonight:vote-end'; payload: {voteId: string}}
  /** Drawer's phone. A stroke id that already exists gets these points appended, so a long line streams in pieces. */
  | {type: 'sketch:stroke'; payload: {gameId: string; round: number; stroke: Stroke}}
  | {type: 'sketch:clear'; payload: {gameId: string; round: number}}
  | {type: 'sketch:guess'; payload: {gameId: string; round: number; text: string}}
  | {type: 'smart-home:set'; payload: {deviceId: string; on?: boolean; level?: number}}
  /** `title` is the movie for Watched It; the server uses the latest Tonight pick when it is missing. */
  | {type: 'game:start'; payload: {kind: 'quiz'; source: QuizSource; title?: string} | {kind: 'sketch'}}
  /** `profileId` defaults to the phone's own person. */
  | {type: 'game:answer'; payload: {gameId: string; round: number; choice: number; profileId?: string}}
  /** Skip ahead: question → reveal, reveal → next question. */
  | {type: 'game:next'; payload: {gameId: string}}
  | {type: 'game:end'; payload: {gameId: string}}
  | {type: 'door:simulate'; payload: {kind?: 'ring' | 'motion'}}
  | {type: 'ping'; payload: Record<string, never>};

/** Server → client. */
export type ServerMessage =
  | {type: 'welcome'; payload: {snapshot: HouseholdSnapshot; you: ClientInfo; token: string}}
  | {type: 'pair:code'; payload: PairCode}
  | {type: 'household:state'; payload: HouseholdSnapshot}
  | {type: 'client:joined'; payload: ClientInfo}
  | {type: 'client:left'; payload: {clientId: string}}
  | {type: 'profile:changed'; payload: {profileIds: string[]}}
  | {type: 'calendar:updated'; payload: {events: CalendarEvent[]}}
  | {type: 'message:new'; payload: FamilyMessage}
  /** Streamed to the asking client only: chunks of `text` in order, then one frame with `done: true`. */
  | {type: 'chat:reply'; payload: {conversationId: string; text: string; done: boolean}}
  /** Broadcast to the household, so a phone's request shows up on the TV too. */
  | {type: 'tonight:picks'; payload: TonightPicks}
  | {type: 'tonight:vote-state'; payload: TonightVote}
  /** To the drawer's phones only. */
  | {type: 'sketch:prompt'; payload: {gameId: string; round: number; prompt: string}}
  | {type: 'sketch:stroke'; payload: {gameId: string; round: number; stroke: Stroke}}
  | {type: 'sketch:clear'; payload: {gameId: string; round: number}}
  /** A right guess comes without `text`, so it doesn't give the answer away. */
  | {type: 'sketch:guess'; payload: {gameId: string; round: number; profileId: string; text?: string; correct: boolean}}
  | {type: 'smart-home:state'; payload: {devices: SmartDevice[]}}
  | {type: 'game:state'; payload: GameState}
  | {type: 'league:updated'; payload: League}
  | {type: 'weather:updated'; payload: Weather}
  | {type: 'door:event'; payload: DoorEvent}
  | {type: 'error'; payload: {code: ErrorCode; message: string; /** The client frame that caused it. */ replyTo?: string}}
  | {type: 'pong'; payload: Record<string, never>};

export type MessageType = ClientMessage['type'] | ServerMessage['type'];

export interface Envelope<M extends {type: string; payload: unknown}> {
  v: typeof PROTOCOL_VERSION;
  /** Unique per frame; lets clients drop duplicates after a reconnect. */
  id: string;
  /** ms since epoch, sender clock. */
  ts: number;
  type: M['type'];
  payload: M['payload'];
}

export type ClientEnvelope = Envelope<ClientMessage>;
export type ServerEnvelope = Envelope<ServerMessage>;

/** Which topic a server message belongs to. `null` = always delivered. */
export const SERVER_MESSAGE_TOPIC: Record<ServerMessage['type'], Topic | null> = {
  welcome: null,
  'pair:code': null,
  'household:state': 'household',
  'client:joined': 'household',
  'client:left': 'household',
  'profile:changed': 'household',
  'calendar:updated': 'calendar',
  'message:new': 'messages',
  'chat:reply': 'chat',
  'tonight:picks': 'tonight',
  'tonight:vote-state': 'tonight',
  'sketch:prompt': 'sketch',
  'sketch:stroke': 'sketch',
  'sketch:clear': 'sketch',
  'sketch:guess': 'sketch',
  'smart-home:state': 'smart-home',
  'game:state': 'game',
  'league:updated': 'game',
  'weather:updated': 'weather',
  'door:event': 'door',
  error: null,
  pong: null,
};

/** Which roles may send each client message. The server enforces this. */
export const CLIENT_MESSAGE_ROLES: Record<ClientMessage['type'], readonly ClientRole[]> = {
  hello: ['tv', 'phone', 'display', 'voice'],
  subscribe: ['tv', 'phone', 'display', 'voice'],
  'pair:request': ['tv'],
  'profile:switch': ['tv', 'phone', 'voice'],
  'message:send': ['phone', 'voice'],
  'calendar:add': ['phone', 'voice'],
  'calendar:remove': ['phone', 'voice'],
  'chat:ask': ['phone', 'voice', 'tv'],
  'tonight:request': ['tv', 'phone', 'voice'],
  'tonight:vote-start': ['tv', 'phone'],
  'tonight:vote': ['phone'],
  'tonight:vote-next': ['tv', 'phone'],
  'tonight:vote-end': ['tv', 'phone'],
  'sketch:stroke': ['phone'],
  'sketch:clear': ['phone'],
  'sketch:guess': ['phone'],
  'smart-home:set': ['tv', 'phone', 'voice'],
  'game:start': ['tv', 'phone'],
  'game:answer': ['phone'],
  'game:next': ['tv', 'phone'],
  'game:end': ['tv', 'phone'],
  'door:simulate': ['phone'],
  ping: ['tv', 'phone', 'display', 'voice'],
};

/** Default subscriptions per role. A display shows the calm stuff unless it asks for more. */
export const DEFAULT_TOPICS: Record<ClientRole, readonly Topic[]> = {
  tv: ALL_TOPICS,
  phone: ['household', 'calendar', 'messages', 'chat', 'tonight', 'sketch', 'game', 'smart-home', 'weather', 'door'],
  display: ['household', 'calendar', 'messages', 'sketch', 'game', 'weather', 'door'],
  voice: ['household', 'calendar', 'tonight', 'weather'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let counter = 0;
function nextId(): string {
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function envelope<M extends ClientMessage | ServerMessage>(
  type: M['type'],
  payload: M['payload'],
): Envelope<M> {
  return {v: PROTOCOL_VERSION, id: nextId(), ts: Date.now(), type, payload};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Cheap structural check before trusting a frame. Payload shape is checked per handler. */
export function parseEnvelope(raw: string): Envelope<{type: string; payload: unknown}> | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  if (data.v !== PROTOCOL_VERSION) return null;
  if (typeof data.id !== 'string' || typeof data.type !== 'string') return null;
  if (typeof data.ts !== 'number') return null;
  if (!('payload' in data)) return null;
  return data as unknown as Envelope<{type: string; payload: unknown}>;
}

export function isClientMessageType(type: string): type is ClientMessage['type'] {
  return Object.prototype.hasOwnProperty.call(CLIENT_MESSAGE_ROLES, type);
}

export function canSend(role: ClientRole, type: ClientMessage['type']): boolean {
  return CLIENT_MESSAGE_ROLES[type].includes(role);
}

/** Should a server message reach a client with these subscriptions? */
export function shouldDeliver(type: ServerMessage['type'], topics: readonly Topic[]): boolean {
  const topic = SERVER_MESSAGE_TOPIC[type];
  return topic === null || topics.includes(topic);
}

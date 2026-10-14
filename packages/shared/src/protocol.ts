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
  | 'sketch' // Sketch-it game state, strokes, guesses
  | 'smart-home'; // simulated devices

export const ALL_TOPICS: readonly Topic[] = [
  'household',
  'calendar',
  'messages',
  'chat',
  'tonight',
  'sketch',
  'smart-home',
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
}

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

export type SketchPhase = 'idle' | 'drawing' | 'reveal';

export interface SketchState {
  roundId: string | null;
  phase: SketchPhase;
  drawerProfileId?: string;
  /** Only sent to the drawer's phone. Everyone else gets `promptLength`. */
  prompt?: string;
  promptLength?: number;
  /** ISO 8601 deadline for the round. */
  endsAt?: string;
  scores: Record<string, number>;
}

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

export interface HouseholdSnapshot {
  householdId: string;
  name: string;
  profiles: Profile[];
  activeProfileIds: string[];
  events: CalendarEvent[];
  messages: FamilyMessage[];
  devices: SmartDevice[];
  sketch: SketchState;
  clients: ClientInfo[];
}

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
        /** Pairing code from the QR (phones, displays). */
        pairCode?: string;
      };
    }
  | {type: 'subscribe'; payload: {topics: Topic[]}}
  | {type: 'profile:switch'; payload: {profileIds: string[]}}
  | {type: 'message:send'; payload: {text: string}}
  | {type: 'chat:ask'; payload: {text: string; conversationId?: string}}
  | {type: 'tonight:request'; payload: {mood?: string}}
  | {type: 'sketch:start'; payload: {drawerProfileId: string}}
  | {type: 'sketch:stroke'; payload: {roundId: string; stroke: Stroke}}
  | {type: 'sketch:clear'; payload: {roundId: string}}
  | {type: 'sketch:guess'; payload: {roundId: string; text: string}}
  | {type: 'smart-home:set'; payload: {deviceId: string; on?: boolean; level?: number}}
  | {type: 'ping'; payload: Record<string, never>};

/** Server → client. */
export type ServerMessage =
  | {type: 'welcome'; payload: {snapshot: HouseholdSnapshot; you: ClientInfo}}
  | {type: 'household:state'; payload: HouseholdSnapshot}
  | {type: 'client:joined'; payload: ClientInfo}
  | {type: 'client:left'; payload: {clientId: string}}
  | {type: 'profile:changed'; payload: {profileIds: string[]}}
  | {type: 'calendar:updated'; payload: {events: CalendarEvent[]}}
  | {type: 'message:new'; payload: FamilyMessage}
  | {type: 'chat:reply'; payload: {conversationId: string; text: string; done: boolean}}
  | {type: 'tonight:picks'; payload: {picks: TonightPick[]}}
  | {type: 'sketch:state'; payload: SketchState}
  | {type: 'sketch:stroke'; payload: {roundId: string; stroke: Stroke}}
  | {type: 'sketch:clear'; payload: {roundId: string}}
  | {
      type: 'sketch:guess';
      payload: {roundId: string; profileId?: string; text: string; correct: boolean};
    }
  | {type: 'smart-home:state'; payload: {devices: SmartDevice[]}}
  | {type: 'error'; payload: {code: string; message: string}}
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
  'household:state': 'household',
  'client:joined': 'household',
  'client:left': 'household',
  'profile:changed': 'household',
  'calendar:updated': 'calendar',
  'message:new': 'messages',
  'chat:reply': 'chat',
  'tonight:picks': 'tonight',
  'sketch:state': 'sketch',
  'sketch:stroke': 'sketch',
  'sketch:clear': 'sketch',
  'sketch:guess': 'sketch',
  'smart-home:state': 'smart-home',
  error: null,
  pong: null,
};

/** Which roles may send each client message. The server enforces this. */
export const CLIENT_MESSAGE_ROLES: Record<ClientMessage['type'], readonly ClientRole[]> = {
  hello: ['tv', 'phone', 'display', 'voice'],
  subscribe: ['tv', 'phone', 'display', 'voice'],
  'profile:switch': ['tv', 'phone', 'voice'],
  'message:send': ['phone', 'voice'],
  'chat:ask': ['phone', 'voice', 'tv'],
  'tonight:request': ['tv', 'phone', 'voice'],
  'sketch:start': ['tv', 'phone'],
  'sketch:stroke': ['phone'],
  'sketch:clear': ['phone'],
  'sketch:guess': ['phone', 'voice'],
  'smart-home:set': ['tv', 'phone', 'voice'],
  ping: ['tv', 'phone', 'display', 'voice'],
};

/** Default subscriptions per role. A display shows the calm stuff unless it asks for more. */
export const DEFAULT_TOPICS: Record<ClientRole, readonly Topic[]> = {
  tv: ALL_TOPICS,
  phone: ['household', 'messages', 'chat', 'tonight', 'sketch', 'smart-home'],
  display: ['household', 'calendar', 'messages', 'sketch'],
  voice: ['household', 'calendar', 'tonight'],
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

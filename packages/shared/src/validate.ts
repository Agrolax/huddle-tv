/**
 * Shape checks for inbound client payloads. The server runs these before any
 * handler, so a malformed frame becomes an `error` reply instead of an exception.
 * Hand-written to keep the TV bundle free of a schema library.
 */
import {ALL_TOPICS, ClientCapabilities, ClientMessage, ClientRole, TONIGHT_MOODS, TonightMood, Topic} from './protocol';
import {isPairCode, normalizePairCode} from './pairing';

export const MESSAGE_MAX_LENGTH = 280;
const ROLES: readonly ClientRole[] = ['tv', 'phone', 'display', 'voice'];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export type Validation<T> = {ok: true; value: T} | {ok: false; error: string};

type PayloadOf<T extends ClientMessage['type']> = Extract<ClientMessage, {type: T}>['payload'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail<T>(error: string): Validation<T> {
  return {ok: false, error};
}

function optionalString(obj: Record<string, unknown>, key: string, max: number): string | undefined | null {
  const v = obj[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || v.length > max) return null;
  return v;
}

export function isId(v: unknown): v is string {
  return typeof v === 'string' && ID_PATTERN.test(v);
}

export function validateHello(payload: unknown): Validation<PayloadOf<'hello'>> {
  if (!isRecord(payload)) return fail('hello payload must be an object');
  const {householdId, client, capabilities, topics} = payload;
  if (!isId(householdId)) return fail('hello.householdId must be 1-64 letters, digits, - or _');
  if (!isRecord(client)) return fail('hello.client must be an object');
  if (!isId(client.clientId)) return fail('hello.client.clientId must be 1-64 letters, digits, - or _');
  if (typeof client.role !== 'string' || !ROLES.includes(client.role as ClientRole)) {
    return fail(`hello.client.role must be one of ${ROLES.join(', ')}`);
  }
  const label = optionalString(client, 'label', 60);
  if (label === null) return fail('hello.client.label must be a string up to 60 chars');
  if (client.profileId !== undefined && !isId(client.profileId)) return fail('hello.client.profileId is not a valid id');
  if (capabilities !== undefined && !isRecord(capabilities)) return fail('hello.capabilities must be an object');
  if (topics !== undefined) {
    if (!Array.isArray(topics) || !topics.every(t => ALL_TOPICS.includes(t as Topic))) {
      return fail(`hello.topics must be an array of ${ALL_TOPICS.join(', ')}`);
    }
  }
  const pairCode = optionalString(payload, 'pairCode', 16);
  if (pairCode === null || (pairCode !== undefined && !isPairCode(pairCode))) return fail('hello.pairCode is not a pair code');
  const token = optionalString(payload, 'token', 128);
  if (token === null) return fail('hello.token must be a string');

  return {
    ok: true,
    value: {
      householdId,
      client: {
        clientId: client.clientId,
        role: client.role as ClientRole,
        ...(label !== undefined ? {label} : {}),
        ...(client.profileId !== undefined ? {profileId: client.profileId as string} : {}),
      },
      capabilities: (capabilities ?? {}) as ClientCapabilities,
      topics: (topics ?? []) as Topic[],
      ...(pairCode !== undefined ? {pairCode: normalizePairCode(pairCode)} : {}),
      ...(token !== undefined ? {token} : {}),
    },
  };
}

export function validateProfileSwitch(payload: unknown): Validation<PayloadOf<'profile:switch'>> {
  if (!isRecord(payload) || !Array.isArray(payload.profileIds)) return fail('profile:switch needs profileIds: string[]');
  const ids = payload.profileIds;
  if (ids.length === 0) return fail('profile:switch needs at least one profile');
  if (ids.length > 20 || !ids.every(isId)) return fail('profile:switch.profileIds must be valid ids');
  return {ok: true, value: {profileIds: [...new Set(ids as string[])]}};
}

export function validateMessageSend(payload: unknown): Validation<PayloadOf<'message:send'>> {
  if (!isRecord(payload) || typeof payload.text !== 'string') return fail('message:send needs text: string');
  const text = payload.text.trim();
  if (!text) return fail('message:send.text is empty');
  if ([...text].length > MESSAGE_MAX_LENGTH) return fail(`message:send.text is longer than ${MESSAGE_MAX_LENGTH} characters`);
  if (payload.fromProfileId !== undefined && !isId(payload.fromProfileId)) return fail('message:send.fromProfileId is not a valid id');
  return {
    ok: true,
    value: {text, ...(payload.fromProfileId !== undefined ? {fromProfileId: payload.fromProfileId as string} : {})},
  };
}

export function validateSubscribe(payload: unknown): Validation<PayloadOf<'subscribe'>> {
  if (!isRecord(payload) || !Array.isArray(payload.topics) || !payload.topics.every(t => ALL_TOPICS.includes(t as Topic))) {
    return fail(`subscribe.topics must be an array of ${ALL_TOPICS.join(', ')}`);
  }
  return {ok: true, value: {topics: payload.topics as Topic[]}};
}

export function validateEmpty(type: string, payload: unknown): Validation<Record<string, never>> {
  if (payload !== undefined && !isRecord(payload)) return fail(`${type} payload must be an object`);
  return {ok: true, value: {}};
}

export const EVENT_TITLE_MAX_LENGTH = 80;

function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
}

export function validateCalendarAdd(payload: unknown): Validation<PayloadOf<'calendar:add'>> {
  if (!isRecord(payload) || typeof payload.title !== 'string') return fail('calendar:add needs title: string');
  const title = payload.title.trim();
  if (!title) return fail('calendar:add.title is empty');
  if ([...title].length > EVENT_TITLE_MAX_LENGTH) return fail(`calendar:add.title is longer than ${EVENT_TITLE_MAX_LENGTH} characters`);
  if (!isIsoDate(payload.start)) return fail('calendar:add.start must be an ISO 8601 date');
  if (payload.end !== undefined) {
    if (!isIsoDate(payload.end)) return fail('calendar:add.end must be an ISO 8601 date');
    if (Date.parse(payload.end) < Date.parse(payload.start)) return fail('calendar:add.end is before start');
  }
  const ids = payload.profileIds ?? [];
  if (!Array.isArray(ids) || ids.length > 20 || !ids.every(isId)) return fail('calendar:add.profileIds must be valid ids');
  return {
    ok: true,
    value: {
      title,
      start: new Date(payload.start).toISOString(),
      ...(payload.end !== undefined ? {end: new Date(payload.end as string).toISOString()} : {}),
      profileIds: [...new Set(ids as string[])],
    },
  };
}

export function validateCalendarRemove(payload: unknown): Validation<PayloadOf<'calendar:remove'>> {
  if (!isRecord(payload) || !isId(payload.eventId)) return fail('calendar:remove needs eventId');
  return {ok: true, value: {eventId: payload.eventId}};
}

export function validateSmartHomeSet(payload: unknown): Validation<PayloadOf<'smart-home:set'>> {
  if (!isRecord(payload) || !isId(payload.deviceId)) return fail('smart-home:set needs deviceId');
  const {on, level} = payload;
  if (on !== undefined && typeof on !== 'boolean') return fail('smart-home:set.on must be a boolean');
  if (level !== undefined && (typeof level !== 'number' || !Number.isFinite(level))) return fail('smart-home:set.level must be a number');
  if (on === undefined && level === undefined) return fail('smart-home:set needs on or level');
  return {
    ok: true,
    value: {deviceId: payload.deviceId, ...(on !== undefined ? {on} : {}), ...(level !== undefined ? {level: level as number} : {})},
  };
}

export function validateTonightRequest(payload: unknown): Validation<PayloadOf<'tonight:request'>> {
  if (payload !== undefined && !isRecord(payload)) return fail('tonight:request payload must be an object');
  const mood = payload?.mood;
  if (mood === undefined) return {ok: true, value: {}};
  if (!TONIGHT_MOODS.some(m => m.id === mood)) return fail(`tonight:request.mood must be one of ${TONIGHT_MOODS.map(m => m.id).join(', ')}`);
  return {ok: true, value: {mood: mood as TonightMood}};
}

export const CHAT_MAX_LENGTH = 500;

export function validateChatAsk(payload: unknown): Validation<PayloadOf<'chat:ask'>> {
  if (!isRecord(payload) || typeof payload.text !== 'string') return fail('chat:ask needs text: string');
  const text = payload.text.trim();
  if (!text) return fail('chat:ask.text is empty');
  if ([...text].length > CHAT_MAX_LENGTH) return fail(`chat:ask.text is longer than ${CHAT_MAX_LENGTH} characters`);
  if (payload.conversationId !== undefined && !isId(payload.conversationId)) return fail('chat:ask.conversationId is not a valid id');
  return {
    ok: true,
    value: {text, ...(payload.conversationId !== undefined ? {conversationId: payload.conversationId as string} : {})},
  };
}

export function validateDoorSimulate(payload: unknown): Validation<PayloadOf<'door:simulate'>> {
  if (payload !== undefined && !isRecord(payload)) return fail('door:simulate payload must be an object');
  const kind = isRecord(payload) ? payload.kind : undefined;
  if (kind !== undefined && kind !== 'ring' && kind !== 'motion') return fail('door:simulate.kind must be ring or motion');
  return {ok: true, value: kind ? {kind: kind as 'ring' | 'motion'} : {}};
}

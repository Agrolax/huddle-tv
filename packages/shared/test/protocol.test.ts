import {
  ALL_TOPICS,
  DEFAULT_TOPICS,
  PROTOCOL_VERSION,
  canSend,
  envelope,
  isClientMessageType,
  parseEnvelope,
  shouldDeliver,
} from '../src/protocol';

describe('protocol', () => {
  it('round-trips an envelope through JSON', () => {
    const env = envelope('message:send', {text: 'Pizza night'});
    const parsed = parseEnvelope(JSON.stringify(env));
    expect(parsed).toEqual(env);
    expect(parsed?.v).toBe(PROTOCOL_VERSION);
  });

  it('rejects malformed frames', () => {
    expect(parseEnvelope('not json')).toBeNull();
    expect(parseEnvelope('[]')).toBeNull();
    expect(parseEnvelope(JSON.stringify({v: 99, id: 'a', ts: 1, type: 'ping', payload: {}}))).toBeNull();
    expect(parseEnvelope(JSON.stringify({v: 1, id: 'a', ts: 1, type: 'ping'}))).toBeNull();
  });

  it('gives each envelope a unique id', () => {
    const a = envelope('ping', {});
    const b = envelope('ping', {});
    expect(a.id).not.toBe(b.id);
  });

  it('only lets phones draw in Sketch it', () => {
    expect(canSend('phone', 'sketch:stroke')).toBe(true);
    expect(canSend('tv', 'sketch:stroke')).toBe(false);
    expect(canSend('display', 'sketch:stroke')).toBe(false);
  });

  it('keeps displays read-only apart from handshake', () => {
    const allowed: string[] = ['hello', 'subscribe', 'ping'];
    for (const type of ['hello', 'subscribe', 'ping', 'message:send', 'smart-home:set', 'sketch:guess'] as const) {
      expect(canSend('display', type)).toBe(allowed.includes(type));
    }
  });

  it('routes server messages by topic', () => {
    expect(shouldDeliver('sketch:stroke', ['calendar'])).toBe(false);
    expect(shouldDeliver('sketch:stroke', ['sketch'])).toBe(true);
    expect(shouldDeliver('welcome', [])).toBe(true);
    expect(shouldDeliver('error', [])).toBe(true);
  });

  it('a second display can follow calendar and sketch guesses by default', () => {
    expect(DEFAULT_TOPICS.display).toEqual(expect.arrayContaining(['calendar', 'sketch']));
    expect(DEFAULT_TOPICS.tv).toEqual(ALL_TOPICS);
  });

  it('recognises client message types', () => {
    expect(isClientMessageType('chat:ask')).toBe(true);
    expect(isClientMessageType('welcome')).toBe(false);
    expect(isClientMessageType('__proto__')).toBe(false);
  });
});

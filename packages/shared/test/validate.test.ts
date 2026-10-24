import {
  CHAT_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  validateChatAsk,
  validateEmpty,
  validateHello,
  validateMessageSend,
  validateProfileSwitch,
  validateSubscribe,
  validateTonightRequest,
} from '../src/validate';

const goodHello = {
  householdId: 'demo',
  client: {clientId: 'phone-1', role: 'phone'},
  capabilities: {touch: true},
  topics: ['household', 'messages'],
  pairCode: 'h7k2qp',
};

describe('validateHello', () => {
  it('accepts a phone hello and normalises the code', () => {
    const r = validateHello(goodHello);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.pairCode).toBe('H7K2QP');
      expect(r.value.client).toEqual({clientId: 'phone-1', role: 'phone'});
    }
  });

  it('defaults capabilities and topics', () => {
    const r = validateHello({householdId: 'demo', client: {clientId: 'tv-1', role: 'tv'}});
    expect(r).toEqual({ok: true, value: {householdId: 'demo', client: {clientId: 'tv-1', role: 'tv'}, capabilities: {}, topics: []}});
  });

  it.each([
    ['not an object', 'nope'],
    ['missing household', {...goodHello, householdId: undefined}],
    ['bad household id', {...goodHello, householdId: '../etc'}],
    ['missing client', {...goodHello, client: undefined}],
    ['unknown role', {...goodHello, client: {clientId: 'x', role: 'admin'}}],
    ['bad client id', {...goodHello, client: {clientId: '', role: 'phone'}}],
    ['unknown topic', {...goodHello, topics: ['secrets']}],
    ['topics not array', {...goodHello, topics: 'household'}],
    ['bad pair code', {...goodHello, pairCode: '0000'}],
    ['token not string', {...goodHello, token: 42}],
    ['label too long', {...goodHello, client: {clientId: 'x', role: 'phone', label: 'x'.repeat(61)}}],
  ])('rejects %s', (_name, payload) => {
    expect(validateHello(payload).ok).toBe(false);
  });

  it('drops unknown fields on the client', () => {
    const r = validateHello({...goodHello, client: {clientId: 'p', role: 'phone', isAdmin: true}});
    expect(r.ok && r.value.client).toEqual({clientId: 'p', role: 'phone'});
  });
});

describe('validateProfileSwitch', () => {
  it('dedupes ids', () => {
    expect(validateProfileSwitch({profileIds: ['leo', 'leo', 'nora']})).toEqual({ok: true, value: {profileIds: ['leo', 'nora']}});
  });
  it.each([[undefined], [{}], [{profileIds: []}], [{profileIds: [1]}], [{profileIds: 'leo'}]])('rejects %p', p => {
    expect(validateProfileSwitch(p).ok).toBe(false);
  });
});

describe('validateMessageSend', () => {
  it('trims text', () => {
    expect(validateMessageSend({text: '  Pizza night  '})).toEqual({ok: true, value: {text: 'Pizza night'}});
  });
  it('allows exactly the max length, counting emoji as one character', () => {
    expect(validateMessageSend({text: '🍕'.repeat(MESSAGE_MAX_LENGTH)}).ok).toBe(true);
    expect(validateMessageSend({text: 'x'.repeat(MESSAGE_MAX_LENGTH + 1)}).ok).toBe(false);
  });
  it.each([[{}], [{text: '   '}], [{text: 5}], [{text: 'hi', fromProfileId: '!!'}]])('rejects %p', p => {
    expect(validateMessageSend(p).ok).toBe(false);
  });
});

describe('other payloads', () => {
  it('subscribe needs known topics', () => {
    expect(validateSubscribe({topics: ['sketch']}).ok).toBe(true);
    expect(validateSubscribe({topics: ['nope']}).ok).toBe(false);
  });
  it('empty payloads accept {} or nothing', () => {
    expect(validateEmpty('ping', {}).ok).toBe(true);
    expect(validateEmpty('ping', undefined).ok).toBe(true);
    expect(validateEmpty('ping', [1]).ok).toBe(false);
  });
});

describe('validateTonightRequest', () => {
  it('accepts no mood or a known mood', () => {
    expect(validateTonightRequest({})).toEqual({ok: true, value: {}});
    expect(validateTonightRequest(undefined)).toEqual({ok: true, value: {}});
    expect(validateTonightRequest({mood: 'edge-of-seat'})).toEqual({ok: true, value: {mood: 'edge-of-seat'}});
  });
  it.each([[{mood: 'sad'}], [{mood: 3}], ['cozy'], [[1]]])('rejects %p', p => {
    expect(validateTonightRequest(p).ok).toBe(false);
  });
});

describe('validateChatAsk', () => {
  it('trims text and keeps the conversation id', () => {
    expect(validateChatAsk({text: '  hi ', conversationId: 'c-1'})).toEqual({ok: true, value: {text: 'hi', conversationId: 'c-1'}});
  });
  it('caps the length', () => {
    expect(validateChatAsk({text: 'x'.repeat(CHAT_MAX_LENGTH)}).ok).toBe(true);
    expect(validateChatAsk({text: 'x'.repeat(CHAT_MAX_LENGTH + 1)}).ok).toBe(false);
  });
  it.each([[{}], [{text: '  '}], [{text: 1}], [{text: 'hi', conversationId: '../x'}]])('rejects %p', p => {
    expect(validateChatAsk(p).ok).toBe(false);
  });
});

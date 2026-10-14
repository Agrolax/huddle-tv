import {after, before, beforeEach, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {PAIR_CODE_TTL_MS, isPairCode} from '@huddle/shared';
import {CLOSE, Hub, HubSocket} from '../src/hub.js';
import {TestClient, TestServer, claimTv, hello, pairPhone, startServer} from './helpers.js';

let server: TestServer;
let householdN = 0;
let hh: string;

before(async () => {
  server = await startServer();
});
after(async () => {
  await server.close();
});
beforeEach(() => {
  hh = `home${++householdN}`;
});

describe('TV claim and pair codes', () => {
  it('the first TV claims the household and gets a token', async () => {
    const tv = await TestClient.open(server.url);
    tv.send('hello', hello('tv', {}, hh));
    const welcome = await tv.next();
    assert.equal(welcome.type, 'welcome');
    assert.equal(welcome.payload.snapshot.householdId, hh);
    assert.equal(typeof welcome.payload.token, 'string');
    assert.ok(welcome.payload.token.length >= 20);
    tv.close();
  });

  it('issues a 6-character code and a join URL with h and c', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    assert.ok(isPairCode(pair.code));
    assert.equal(pair.joinUrl, `http://10.0.0.5:5173/?h=${hh}&c=${pair.code}`);
    assert.equal(pair.expiresAt, server.clock.now + PAIR_CODE_TTL_MS);
    tv.close();
  });

  it('a second TV without the token is rejected', async () => {
    const {tv} = await claimTv(server.url, hh);
    const intruder = await TestClient.open(server.url);
    intruder.send('hello', hello('tv', {}, hh));
    const err = await intruder.next();
    assert.equal(err.type, 'error');
    assert.equal(err.payload.code, 'tv-claimed');
    assert.equal((await intruder.closed).code, CLOSE.rejected);
    tv.close();
  });

  it('a TV with the token reclaims the household and replaces the old socket', async () => {
    const {tv, token} = await claimTv(server.url, hh);
    const again = await TestClient.open(server.url);
    again.send('hello', hello('tv', {token}, hh));
    assert.equal((await again.next()).type, 'welcome');
    assert.equal((await tv.closed).code, CLOSE.replaced);
    again.close();
  });

  it('only a TV may request a pair code', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, {}, hh);
    const id = phone.send('pair:request', {});
    const err = await phone.nextOf('error');
    assert.equal(err.payload.code, 'forbidden');
    assert.equal(err.payload.replyTo, id);
    tv.close();
    phone.close();
  });
});

describe('phone pairing', () => {
  it('pairs with a valid code; the TV sees it join', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone, welcome} = await pairPhone(server.url, pair.code.toLowerCase(), {}, hh);
    assert.equal(welcome.type, 'welcome');
    assert.equal(welcome.payload.you.role, 'phone');
    assert.equal(welcome.payload.snapshot.name, 'The Khans');
    const joined = await tv.nextOf('client:joined');
    assert.equal(joined.payload.role, 'phone');
    tv.close();
    phone.close();
  });

  it('rejects a wrong code', async () => {
    const {tv} = await claimTv(server.url, hh);
    const {phone, welcome} = await pairPhone(server.url, 'ZZZZZZ', {}, hh);
    assert.equal(welcome.type, 'error');
    assert.equal(welcome.payload.code, 'pair-code-invalid');
    assert.equal((await phone.closed).code, CLOSE.rejected);
    tv.close();
  });

  it('rejects an expired code', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    server.clock.now += PAIR_CODE_TTL_MS + 1;
    try {
      const {welcome} = await pairPhone(server.url, pair.code, {}, hh);
      assert.equal(welcome.payload.code, 'pair-code-expired');
    } finally {
      server.clock.now -= PAIR_CODE_TTL_MS + 1;
      tv.close();
    }
  });

  it('rejects a phone without a code', async () => {
    const {tv} = await claimTv(server.url, hh);
    const phone = await TestClient.open(server.url);
    phone.send('hello', hello('phone', {}, hh));
    assert.equal((await phone.next()).payload.code, 'pairing-required');
    tv.close();
  });

  it('rejects a phone for a household that does not exist', async () => {
    const {welcome} = await pairPhone(server.url, 'ABCDEF', {}, 'nobody-home');
    assert.equal(welcome.payload.code, 'pair-code-invalid');
  });

  it('a paired phone reconnects with its token after the code expired', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone, welcome} = await pairPhone(server.url, pair.code, {}, hh);
    phone.close();
    server.clock.now += PAIR_CODE_TTL_MS * 3;
    try {
      const again = await TestClient.open(server.url);
      again.send('hello', hello('phone', {pairCode: pair.code, token: welcome.payload.token}, hh));
      assert.equal((await again.next()).type, 'welcome');
      again.close();
    } finally {
      server.clock.now -= PAIR_CODE_TTL_MS * 3;
      tv.close();
    }
  });

  it("a phone's token does not let it claim the TV role", async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {welcome} = await pairPhone(server.url, pair.code, {}, hh);
    const fake = await TestClient.open(server.url);
    fake.send('hello', hello('tv', {token: welcome.payload.token}, hh));
    assert.equal((await fake.next()).payload.code, 'tv-claimed');
    tv.close();
  });
});

describe('validation and robustness', () => {
  it('rejects a malformed hello without closing the socket', async () => {
    const c = await TestClient.open(server.url);
    c.send('hello', {householdId: hh, client: {role: 'tv'}});
    const err = await c.next();
    assert.equal(err.payload.code, 'bad-request');
    assert.match(err.payload.message, /clientId/);
    c.send('hello', hello('tv', {}, hh));
    assert.equal((await c.next()).type, 'welcome');
    c.close();
  });

  it('answers garbage with errors and keeps serving', async () => {
    const c = await TestClient.open(server.url);
    c.sendRaw('not json');
    assert.equal((await c.next()).payload.code, 'bad-request');
    c.sendRaw(JSON.stringify({v: 1, id: 'x', ts: 1, type: 'teleport', payload: {}}));
    assert.match((await c.next()).payload.message, /unknown message type/);
    c.sendRaw('x'.repeat(20_000));
    assert.match((await c.next()).payload.message, /larger than/);
    c.send('ping', {});
    assert.equal((await c.next()).payload.code, 'not-ready');
    c.send('hello', hello('tv', {}, hh));
    assert.equal((await c.next()).type, 'welcome');
    c.send('ping', {});
    assert.equal((await c.next()).type, 'pong');
    c.close();
  });

  it('a display is read-only', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const display = await TestClient.open(server.url);
    display.send('hello', hello('display', {pairCode: pair.code}, hh));
    assert.equal((await display.next()).type, 'welcome');
    display.send('message:send', {text: 'hi'});
    assert.equal((await display.nextOf('error')).payload.code, 'forbidden');
    tv.close();
    display.close();
  });

  it('a crashing handler becomes an internal error, not a dead process', () => {
    const sent: string[] = [];
    const logs: string[] = [];
    const socket: HubSocket = {readyState: 1, send: d => sent.push(d), close: () => {}};
    const hub = new Hub({companionUrl: 'http://x/', log: m => logs.push(m)});
    (hub as unknown as {handle: () => never}).handle = () => {
      throw new Error('boom');
    };
    const {onMessage} = hub.connect(socket);
    assert.doesNotThrow(() => onMessage(JSON.stringify({v: 1, id: 'f1', ts: 1, type: 'ping', payload: {}})));
    const frame = JSON.parse(sent[0]!);
    assert.equal(frame.payload.code, 'internal');
    assert.equal(frame.payload.replyTo, 'f1');
    assert.deepEqual(logs, ['handler crashed']);
  });
});

describe('profile:switch and message:send', () => {
  it('broadcasts a profile switch from a phone to the TV and other phones', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, {}, hh);
    const {phone: phone2} = await pairPhone(server.url, pair.code, {}, hh);
    phone.send('profile:switch', {profileIds: ['ammu', 'abbu', 'ammu']});
    assert.deepEqual((await tv.nextOf('profile:changed')).payload, {profileIds: ['ammu', 'abbu']});
    assert.deepEqual((await phone2.nextOf('profile:changed')).payload, {profileIds: ['ammu', 'abbu']});
    assert.deepEqual((await phone.nextOf('profile:changed')).payload, {profileIds: ['ammu', 'abbu']});
    assert.deepEqual(server.hub.household(hh)!.activeProfileIds, ['ammu', 'abbu']);
    tv.close();
    phone.close();
    phone2.close();
  });

  it('rejects unknown or empty profiles', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, {}, hh);
    phone.send('profile:switch', {profileIds: ['mallory']});
    assert.match((await phone.nextOf('error')).payload.message, /unknown profile/);
    phone.send('profile:switch', {profileIds: []});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    assert.equal(await tv.noneOf('profile:changed'), true);
    tv.close();
    phone.close();
  });

  it('broadcasts a message with its sender', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, {}, hh);
    phone.send('message:send', {text: '  Pizza night 🍕  ', fromProfileId: 'ammu'});
    const msg = await tv.nextOf('message:new');
    assert.equal(msg.payload.text, 'Pizza night 🍕');
    assert.equal(msg.payload.fromProfileId, 'ammu');
    assert.equal(msg.payload.fromClient, 'phone');
    assert.equal(server.hub.household(hh)!.messages[0]!.text, 'Pizza night 🍕');
    tv.close();
    phone.close();
  });

  it('rejects an over-long message', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, {}, hh);
    phone.send('message:send', {text: 'x'.repeat(281)});
    assert.match((await phone.nextOf('error')).payload.message, /280/);
    assert.equal(await tv.noneOf('message:new'), true);
    tv.close();
    phone.close();
  });

  it('a phone can drop topics it does not want', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, {topics: ['household']}, hh);
    tv.send('profile:switch', {profileIds: ['rafi']});
    assert.equal((await phone.nextOf('profile:changed')).payload.profileIds[0], 'rafi');
    const {phone: other} = await pairPhone(server.url, pair.code, {}, hh);
    other.send('message:send', {text: 'hello'});
    assert.equal((await tv.nextOf('message:new')).payload.text, 'hello');
    assert.equal(await phone.noneOf('message:new'), true); // not subscribed to messages
    tv.close();
    phone.close();
    other.close();
  });
});

import {after, before, beforeEach, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {ConverseCommand, ConverseStreamCommand} from '@aws-sdk/client-bedrock-runtime';
import type {TonightPick} from '@huddle/shared';
import {BedrockAI, ChatContext, HouseholdAI, MockAI, QuizContext, QuizResult, TonightContext, createAI, mockAnswer, mockTonight} from '../src/ai/index.js';
import {chatSystem, toMessages, tonightPrompt} from '../src/ai/bedrock.js';
import {joinNames, parsePicksJson, sanitizePicks} from '../src/ai/types.js';
import {demoHousehold} from '../src/household.js';
import {TestClient, TestServer, claimTv, pairPhone, startServer} from './helpers.js';

const RAFI = {id: 'leo', name: 'Leo', kid: true};
const NANU = {id: 'nora', name: 'Nora'};

/** An AI whose answers each test controls. */
class ScriptedAI implements HouseholdAI {
  readonly source = 'bedrock' as const;
  tonightCalls: TonightContext[] = [];
  chatCalls: ChatContext[] = [];
  tonightImpl: (ctx: TonightContext) => Promise<TonightPick[]> = async () => [];
  chatImpl: (ctx: ChatContext) => AsyncIterable<string> = async function* () {};
  tonight(ctx: TonightContext) {
    this.tonightCalls.push(ctx);
    return this.tonightImpl(ctx);
  }
  chat(ctx: ChatContext) {
    this.chatCalls.push(ctx);
    return this.chatImpl(ctx);
  }
  quizCalls: QuizContext[] = [];
  quizImpl: (ctx: QuizContext) => Promise<QuizResult> = async () => ({title: '', items: []});
  quiz(ctx: QuizContext) {
    this.quizCalls.push(ctx);
    return this.quizImpl(ctx);
  }
}

async function collectReply(phone: TestClient): Promise<{text: string; frames: any[]}> {
  const frames: any[] = [];
  for (;;) {
    const f = await phone.nextOf('chat:reply');
    frames.push(f.payload);
    if (f.payload.done) break;
  }
  return {text: frames.map(f => f.text).join(''), frames};
}

describe('mock AI', () => {
  it('gives three deterministic picks that name who is here', () => {
    const a = mockTonight([RAFI, NANU], 'cozy');
    assert.equal(a.length, 3);
    assert.deepEqual(mockTonight([RAFI, NANU], 'cozy'), a);
    const titles = (picks: TonightPick[]) => picks.map(p => p.title);
    assert.deepEqual(titles(mockTonight([NANU, RAFI], 'cozy')), titles(a), 'order of people does not change the titles');
    for (const p of a) {
      assert.match(p.why, /Leo and Nora/);
      assert.ok(p.year && p.service);
    }
    assert.equal(new Set(a.map(p => p.title)).size, 3);
  });

  it('mixes moods when none is given', () => {
    const titles = mockTonight([RAFI]).map(p => p.title);
    assert.equal(titles.length, 3);
    assert.equal(new Set(titles).size, 3);
  });

  it('answers from the household context', () => {
    const hh = demoHousehold('x', new Date(2026, 9, 15, 12).getTime(), {place: 'Toronto', tempC: 6, code: 61, highC: 9, lowC: 3, updatedAt: ''});
    const ctx = (text: string): ChatContext => ({
      householdName: hh.name,
      people: [RAFI, NANU],
      events: hh.events,
      devices: hh.devices,
      weather: hh.weather,
      now: new Date(2026, 9, 15, 12),
      turns: [{role: 'user', text}],
    });
    assert.match(mockAnswer(ctx('Do I need a jacket?')), /6° and rain in Toronto.*Bring a jacket/);
    assert.match(mockAnswer(ctx("What's on the calendar?")), /Pizza night \(today at 7:00\), Dentist \(tomorrow\)/);
    assert.match(mockAnswer(ctx('What should we watch?')), /For Leo and Nora, try/);
    assert.match(mockAnswer(ctx('Is the front door locked?')), /Front door: Locked/);
    assert.match(mockAnswer(ctx('why is the sky blue')), /demo mode/);
  });

  it('createAI picks the mock unless HUDDLE_AI=bedrock', () => {
    assert.equal(createAI({}).source, 'mock');
    assert.equal(createAI({HUDDLE_AI: 'mock'}).source, 'mock');
    assert.equal(createAI({HUDDLE_AI: 'bedrock', AWS_REGION: 'us-east-1'}).source, 'bedrock');
  });
});

describe('model output parsing', () => {
  it('reads picks from a code fence or prose', () => {
    const text = 'Sure!\n```json\n{"picks":[{"title":"Up","year":2009,"service":"Disney+","why":"Sweet."}]}\n```';
    assert.deepEqual(parsePicksJson(text), [{title: 'Up', year: 2009, service: 'Disney+', why: 'Sweet.'}]);
    assert.deepEqual(parsePicksJson('[{"title":"Up","why":"Sweet.","year":"2009"}]'), [{title: 'Up', year: 2009, why: 'Sweet.'}]);
    assert.deepEqual(parsePicksJson('no json here'), []);
    assert.deepEqual(parsePicksJson('{"picks": [oops'), []);
  });

  it('drops malformed picks and clips long fields', () => {
    const picks = sanitizePicks([
      {title: 'A', why: 'ok', year: 1800},
      {title: '', why: 'no title'},
      {why: 'missing'},
      'nope',
      {title: 'x'.repeat(200), why: 'y'.repeat(300), service: 'Prime Video'},
    ]);
    assert.equal(picks.length, 2);
    assert.equal(picks[0]!.year, undefined);
    assert.equal([...picks[1]!.title].length, 80);
    assert.ok(picks[1]!.why.endsWith('…'));
  });

  it('joins names like a person would', () => {
    assert.equal(joinNames([]), 'everyone');
    assert.equal(joinNames([RAFI]), 'Leo');
    assert.equal(joinNames([RAFI, NANU, {id: 'a', name: 'Maya'}]), 'Leo, Nora and Maya');
  });
});

describe('Bedrock client', () => {
  it('asks Nova for JSON picks and keeps three', async () => {
    const sent: any[] = [];
    const picks = Array.from({length: 4}, (_, i) => ({title: `T${i}`, year: 2000 + i, service: 'Prime Video', why: 'For Leo.'}));
    const client = {
      send: async (cmd: any) => {
        sent.push(cmd);
        return {output: {message: {content: [{text: JSON.stringify({picks})}]}}};
      },
    };
    const ai = new BedrockAI({region: 'us-east-1', client: client as any});
    const out = await ai.tonight({people: [RAFI, NANU], mood: 'funny', now: new Date(2026, 9, 15)});
    assert.equal(out.length, 3);
    const first: any = sent[0];
    assert.ok(first instanceof ConverseCommand);
    assert.equal(sent[0].input.modelId, 'us.amazon.nova-lite-v1:0');
    assert.match(sent[0].input.messages[0].content[0].text, /Leo and Nora[\s\S]*Mood: Funny/);
  });

  it('tells the model a child is here and how many minutes are left', async () => {
    const sent: any[] = [];
    const picks = Array.from({length: 3}, (_, i) => ({title: `T${i}`, minutes: 80, why: 'x'}));
    const client = {send: async (cmd: any) => (sent.push(cmd), {output: {message: {content: [{text: JSON.stringify({picks})}]}}})};
    const ai = new BedrockAI({region: 'us-east-1', client: client as any});
    await ai.tonight({people: [RAFI, NANU], now: new Date(2026, 9, 15, 19), endsBy: {at: new Date(2026, 9, 15, 20, 30), reason: "Leo's bedtime"}});
    const prompt = sent[0].input.messages[0].content[0].text;
    assert.match(prompt, /Leo is a child: only picks rated G, PG/);
    assert.match(prompt, /at most 90 minutes/);
  });

  it('keeps only quiz questions a second, cold pass answers the same way', async () => {
    const questions = Array.from({length: 8}, (_, i) => ({question: `Q${i}?`, choices: ['a', 'b', 'c', 'd'], answer: i % 4}));
    const replies = [JSON.stringify({questions}), '{"answers":[0,1,-1,3,0,0,2,3]}'];
    const sent: any[] = [];
    const client = {send: async (cmd: any) => (sent.push(cmd), {output: {message: {content: [{text: replies[sent.length - 1]}]}}})};
    const ai = new BedrockAI({region: 'us-east-1', client: client as any});
    const out = await ai.quiz({title: 'Up', people: [RAFI], now: new Date()});
    assert.deepEqual(out.items.map(q => q.text), ['Q0?', 'Q1?', 'Q3?', 'Q4?', 'Q6?'].slice(0, 5));
    assert.equal(sent[0].input.modelId, 'us.amazon.nova-pro-v1:0');
    assert.doesNotMatch(sent[1].input.messages[0].content[0].text, /"answer"/, 'the check pass never sees the answers');
    // Too few survive: the hub falls back to the mock.
    const strict = {send: async () => ({output: {message: {content: [{text: sent.length++ % 2 ? '{"answers":[-1,-1,-1,-1,-1,-1,-1,-1]}' : JSON.stringify({questions})}]}}})};
    await assert.rejects(new BedrockAI({region: 'us-east-1', client: strict as any}).quiz({title: 'Up', people: [RAFI], now: new Date()}), /0 checked questions/);
  });

  it('throws when the model returns too few picks', async () => {
    const client = {send: async () => ({output: {message: {content: [{text: '{"picks":[]}'}]}}})};
    const ai = new BedrockAI({region: 'us-east-1', client: client as any});
    await assert.rejects(ai.tonight({people: [RAFI], now: new Date()}), /0 usable picks/);
  });

  it('streams chat deltas', async () => {
    let cmd: any;
    const client = {
      send: async (c: any) => {
        cmd = c;
        return {
          stream: (async function* () {
            yield {messageStart: {role: 'assistant'}};
            yield {contentBlockDelta: {delta: {text: 'Hello '}}};
            yield {contentBlockDelta: {delta: {text: 'there.'}}};
            yield {messageStop: {}};
          })(),
        };
      },
    };
    const ai = new BedrockAI({region: 'us-east-1', client: client as any, chatModel: 'm'});
    const chunks: string[] = [];
    const hh = demoHousehold('x');
    for await (const c of ai.chat({householdName: 'The Parks', people: [RAFI], events: hh.events, devices: hh.devices, weather: null, now: new Date(), turns: [{role: 'user', text: 'hi'}]})) {
      chunks.push(c);
    }
    assert.deepEqual(chunks, ['Hello ', 'there.']);
    assert.ok((cmd as unknown) instanceof ConverseStreamCommand);
    assert.equal(cmd.input.modelId, 'm');
    assert.match(cmd.input.system[0].text, /The Parks[\s\S]*In the room now: Leo/);
  });

  it('sends alternating turns that start with the user', () => {
    const msgs = toMessages([
      {role: 'assistant', text: 'stray'},
      {role: 'user', text: 'a'},
      {role: 'user', text: 'b'},
      {role: 'assistant', text: ''},
      {role: 'assistant', text: 'c'},
    ]);
    assert.deepEqual(msgs, [
      {role: 'user', content: [{text: 'a\nb'}]},
      {role: 'assistant', content: [{text: 'c'}]},
    ]);
  });

  it('prompts carry the mood and household context', () => {
    assert.match(tonightPrompt({people: [RAFI], now: new Date()}), /give a mix/);
    const sys = chatSystem({householdName: 'The Parks', people: [RAFI], askedBy: NANU, events: [], devices: [], weather: null, now: new Date(), turns: []});
    assert.match(sys, /Nora is asking/);
    assert.match(sys, /nothing coming up/);
  });
});

describe('hub: Tonight', () => {
  let server: TestServer;
  let ai: ScriptedAI;
  let n = 0;
  let hh: string;
  before(async () => {
    ai = new ScriptedAI();
    server = await startServer({ai, fallbackAI: new MockAI({delayMs: 0})});
  });
  after(() => server.close());
  beforeEach(() => {
    hh = `tonight${++n}`;
    ai.tonightCalls = [];
    ai.tonightImpl = async ctx => mockTonight(ctx.people, ctx.mood).map(p => ({...p, why: `AI: ${p.why}`}));
  });

  it('picks for who is here go to the TV and every phone, and stay in the snapshot', async () => {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone, welcome} = await pairPhone(server.url, pair.code, {}, hh);
    assert.equal(welcome.payload.snapshot.tonight, null);
    phone.send('tonight:request', {mood: 'cozy'});
    const [onTv, onPhone] = await Promise.all([tv.nextOf('tonight:picks'), phone.nextOf('tonight:picks')]);
    assert.deepEqual(onTv.payload, onPhone.payload);
    assert.equal(onTv.payload.picks.length, 3);
    assert.equal(onTv.payload.mood, 'cozy');
    assert.equal(onTv.payload.source, 'bedrock');
    assert.deepEqual(onTv.payload.forProfileIds, ['leo', 'nora']);
    assert.deepEqual(ai.tonightCalls[0]!.people, [RAFI, NANU]);

    const {phone: late, welcome: lateWelcome} = await pairPhone(server.url, pair.code, {}, hh);
    assert.deepEqual(lateWelcome.payload.snapshot.tonight, onTv.payload);
    for (const c of [tv, phone, late]) c.close();
  });

  it('follows the people the TV says are here', async () => {
    const {tv} = await claimTv(server.url, hh);
    tv.send('profile:switch', {profileIds: ['maya']});
    await tv.nextOf('profile:changed');
    tv.send('tonight:request', {});
    const picks = await tv.nextOf('tonight:picks');
    assert.deepEqual(picks.payload.forProfileIds, ['maya']);
    assert.equal(picks.payload.mood, undefined);
    assert.match(picks.payload.picks[0].why, /Maya/);
    tv.close();
  });

  it('falls back to the mock when Bedrock fails', async () => {
    ai.tonightImpl = async () => {
      throw new Error('ThrottlingException');
    };
    const {tv} = await claimTv(server.url, hh);
    tv.send('tonight:request', {mood: 'funny'});
    const picks = await tv.nextOf('tonight:picks');
    assert.equal(picks.payload.source, 'mock');
    assert.deepEqual(picks.payload.picks, mockTonight([RAFI, NANU], 'funny'));
    tv.close();
  });

  it('says busy while picks are on their way', async () => {
    let release!: () => void;
    ai.tonightImpl = ctx => new Promise(resolve => (release = () => resolve(mockTonight(ctx.people))));
    const {tv} = await claimTv(server.url, hh);
    tv.send('tonight:request', {});
    tv.send('tonight:request', {mood: 'cozy'});
    assert.equal((await tv.nextOf('error')).payload.code, 'busy');
    release();
    await tv.nextOf('tonight:picks');
    assert.equal(ai.tonightCalls.length, 1);
    tv.close();
  });

  it('rejects an unknown mood', async () => {
    const {tv} = await claimTv(server.url, hh);
    tv.send('tonight:request', {mood: 'sad'});
    assert.equal((await tv.nextOf('error')).payload.code, 'bad-request');
    assert.ok(await tv.noneOf('tonight:picks'));
    tv.close();
  });
});

describe('hub: chat', () => {
  let server: TestServer;
  let ai: ScriptedAI;
  let n = 0;
  let hh: string;
  before(async () => {
    ai = new ScriptedAI();
    server = await startServer({ai, fallbackAI: new MockAI({delayMs: 0})});
  });
  after(() => server.close());
  beforeEach(() => {
    hh = `chat${++n}`;
    ai.chatCalls = [];
    ai.chatImpl = async function* (ctx) {
      yield 'You said: ';
      yield ctx.turns[ctx.turns.length - 1]!.text;
    };
  });

  async function tvAndPhone(extra: Record<string, unknown> = {}) {
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone} = await pairPhone(server.url, pair.code, extra, hh);
    return {tv, phone};
  }

  it('streams the answer to the asking phone only, then done', async () => {
    const {tv, phone} = await tvAndPhone({client: {clientId: 'p1', role: 'phone', profileId: 'nora'}});
    phone.send('chat:ask', {text: ' What should we watch? ', conversationId: 'conv-1'});
    const {text, frames} = await collectReply(phone);
    assert.equal(text, 'You said: What should we watch?');
    assert.deepEqual(frames.map(f => f.done), [false, false, true]);
    assert.ok(frames.every(f => f.conversationId === 'conv-1'));
    assert.deepEqual(ai.chatCalls[0]!.askedBy, NANU);
    assert.deepEqual(ai.chatCalls[0]!.people, [RAFI, NANU]);
    assert.ok(await tv.noneOf('chat:reply'));
    tv.close();
    phone.close();
  });

  it('remembers earlier turns of the same conversation', async () => {
    const {tv, phone} = await tvAndPhone();
    phone.send('chat:ask', {text: 'first', conversationId: 'c'});
    await collectReply(phone);
    phone.send('chat:ask', {text: 'second', conversationId: 'c'});
    await collectReply(phone);
    assert.deepEqual(ai.chatCalls[1]!.turns, [
      {role: 'user', text: 'first'},
      {role: 'assistant', text: 'You said: first'},
      {role: 'user', text: 'second'},
    ]);
    phone.send('chat:ask', {text: 'other', conversationId: 'd'});
    await collectReply(phone);
    assert.equal(ai.chatCalls[2]!.turns.length, 1, 'a new conversation starts fresh');
    tv.close();
    phone.close();
  });

  it('answers with the mock when Bedrock fails before the first word', async () => {
    ai.chatImpl = async function* () {
      throw new Error('AccessDeniedException');
    };
    const {tv, phone} = await tvAndPhone();
    phone.send('chat:ask', {text: 'hello'});
    const {text, frames} = await collectReply(phone);
    assert.match(text, /^Hi! Ask me what to watch/);
    assert.ok(frames[0].conversationId);
    tv.close();
    phone.close();
  });

  it('ends with an apology when the stream breaks halfway', async () => {
    ai.chatImpl = async function* () {
      yield 'Well, ';
      throw new Error('stream reset');
    };
    const {tv, phone} = await tvAndPhone();
    phone.send('chat:ask', {text: 'hello'});
    const {text} = await collectReply(phone);
    assert.equal(text, 'Well,  … sorry, I lost my train of thought.');
    tv.close();
    phone.close();
  });

  it('one question at a time per phone', async () => {
    let release!: () => void;
    ai.chatImpl = async function* () {
      await new Promise<void>(resolve => (release = resolve));
      yield 'ok';
    };
    const {tv, phone} = await tvAndPhone();
    phone.send('chat:ask', {text: 'one'});
    phone.send('chat:ask', {text: 'two'});
    assert.equal((await phone.nextOf('error')).payload.code, 'busy');
    release();
    assert.equal((await collectReply(phone)).text, 'ok');
    tv.close();
    phone.close();
  });

  it('rejects empty or oversized questions', async () => {
    const {tv, phone} = await tvAndPhone();
    phone.send('chat:ask', {text: '   '});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    phone.send('chat:ask', {text: 'x'.repeat(501)});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    assert.equal(ai.chatCalls.length, 0);
    tv.close();
    phone.close();
  });
});

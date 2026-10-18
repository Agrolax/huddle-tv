import {after, before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {SKETCH_DRAWER_POINTS} from '@huddle/shared';
import {MockAI} from '../src/ai/index.js';
import {TestClient, TestServer, claimTv, pairPhone, startServer} from './helpers.js';

describe('Sketch the pick over the wire', () => {
  let server: TestServer;
  let n = 0;

  before(async () => {
    server = await startServer({ai: new MockAI({delayMs: 0}), sketchDrawMs: 1500, sketchRevealMs: 100});
  });
  after(async () => {
    await server.close();
  });

  async function room(...people: string[]) {
    const hh = `sketch-${++n}`;
    const {tv, pair} = await claimTv(server.url, hh);
    const phones: Record<string, TestClient> = {};
    for (const profileId of people) {
      phones[profileId] = (await pairPhone(server.url, pair.code, {client: {clientId: `phone-${profileId}`, role: 'phone', profileId}}, hh)).phone;
    }
    return {hh, tv, phones, close: () => [tv, ...Object.values(phones)].forEach(c => c.close())};
  }

  async function untilPhase(c: TestClient, phase: string, timeoutMs = 3000) {
    for (;;) {
      const f = await c.nextOf('game:state', timeoutMs);
      if (f.payload.phase === phase) return f.payload;
    }
  }

  it('needs two phones', async () => {
    const {tv, close} = await room('rafi');
    tv.send('game:start', {kind: 'sketch'});
    assert.equal((await tv.nextOf('error')).payload.message, 'Sketch the pick needs two phones');
    close();
  });

  it('draws tonight’s picks: only the drawer sees the title, strokes stream, a right guess scores and sets the pick', async () => {
    const {hh, tv, phones, close} = await room('rafi', 'nanu');
    const {rafi, nanu} = phones as {rafi: TestClient; nanu: TestClient};
    tv.send('game:start', {kind: 'sketch'});
    // No picks yet: the server makes them first, then uses them as prompts.
    const picks = (await tv.nextOf('tonight:picks')).payload.picks as Array<{title: string}>;
    const round1 = await untilPhase(tv, 'question');
    assert.equal(round1.kind, 'sketch');
    assert.equal(round1.rounds, picks.length);
    assert.equal(round1.drawerId, 'rafi', 'profile order: Rafi draws first');
    assert.equal(round1.answer, undefined);
    assert.ok(!JSON.stringify(round1).includes(picks[0]!.title), 'the title must not leak');
    assert.equal(round1.hint.length, picks[0]!.title.length);

    const prompt = (await rafi.nextOf('sketch:prompt')).payload;
    assert.deepEqual(prompt, {gameId: round1.gameId, round: 1, prompt: picks[0]!.title});
    assert.equal(await nanu.noneOf('sketch:prompt', 100), true);

    // Strokes stream to the TV; a second chunk with the same id appends.
    const ref = {gameId: round1.gameId, round: 1};
    rafi.send('sketch:stroke', {...ref, stroke: {id: 's1', color: '#3D8BFF', width: 0.01, points: [{x: 0.1, y: 0.1}, {x: 0.2, y: 0.2}]}});
    rafi.send('sketch:stroke', {...ref, stroke: {id: 's1', color: '#3D8BFF', width: 0.01, points: [{x: 0.3, y: 0.3}]}});
    assert.equal((await tv.nextOf('sketch:stroke')).payload.stroke.points.length, 2);
    assert.equal((await tv.nextOf('sketch:stroke')).payload.stroke.points.length, 1);
    assert.equal(server.hub.household(hh)!.sketch.strokes[0]!.points.length, 3, 'a late screen can redraw it');
    nanu.send('sketch:stroke', {...ref, stroke: {id: 's2', color: '#3D8BFF', width: 0.01, points: [{x: 0.5, y: 0.5}]}});
    assert.equal((await nanu.nextOf('error')).payload.message, 'only the drawer can draw');
    rafi.send('sketch:guess', {...ref, text: picks[0]!.title});
    assert.equal((await rafi.nextOf('error')).payload.message, 'the drawer cannot guess');

    // A wrong guess shows its text; a right one doesn't.
    nanu.send('sketch:guess', {...ref, text: 'cars'});
    assert.deepEqual((await tv.nextOf('sketch:guess')).payload, {...ref, profileId: 'nanu', text: 'cars', correct: false});
    nanu.send('sketch:guess', {...ref, text: picks[0]!.title.toLowerCase()});
    assert.deepEqual((await tv.nextOf('sketch:guess')).payload, {...ref, profileId: 'nanu', correct: true});
    // Everyone but the drawer got it: the reveal comes early.
    const reveal = await untilPhase(tv, 'reveal', 500);
    assert.equal(reveal.answer, picks[0]!.title);
    assert.deepEqual(reveal.gained, {nanu: 1000, rafi: SKETCH_DRAWER_POINTS});

    const round2 = await untilPhase(tv, 'question');
    assert.equal(round2.drawerId, 'nanu', 'drawers take turns');
    assert.deepEqual(server.hub.household(hh)!.sketch.strokes, [], 'a new round starts with a blank canvas');

    // Nobody guesses the rest; the timers run it to the end.
    const final = await untilPhase(tv, 'final', 6000);
    assert.deepEqual(final.scores, {rafi: SKETCH_DRAWER_POINTS, nanu: 1000});
    const league = (await tv.nextOf('league:updated')).payload;
    assert.equal(league.nanu.wins, 1);
    const decided = (await tv.nextOf('tonight:picks')).payload;
    assert.equal(decided.chosen, picks.length - 1, 'the last movie drawn is tonight’s pick');
    close();
  });

  it('sends the title again when the drawer’s phone reconnects', async () => {
    const {hh, tv, phones, close} = await room('rafi', 'nanu');
    tv.send('game:start', {kind: 'sketch'});
    const round1 = await untilPhase(tv, 'question');
    phones.rafi!.close();
    const {pair} = await claimTvCode(tv);
    const {phone} = await pairPhone(server.url, pair, {client: {clientId: 'phone-rafi', role: 'phone', profileId: 'rafi'}}, hh);
    assert.equal((await phone.nextOf('sketch:prompt')).payload.gameId, round1.gameId);
    phone.close();
    close();
  });

  async function claimTvCode(tv: TestClient) {
    tv.send('pair:request', {});
    return {pair: (await tv.nextOf('pair:code')).payload.code as string};
  }
});

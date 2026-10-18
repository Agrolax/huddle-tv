import {after, before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import type {Profile, TonightPick} from '@huddle/shared';
import {MockAI, mockTonight} from '../src/ai/index.js';
import {fitPicks, tonightLimit} from '../src/tonight/bedtime.js';
import {VoteEngine} from '../src/tonight/vote.js';
import {TestClient, TestServer, claimTv, pairPhone, startServer} from './helpers.js';

const PROFILES: Profile[] = [
  {id: 'rafi', name: 'Rafi', color: '#000000', kid: true},
  {id: 'nanu', name: 'Nanu', color: '#000000'},
  {id: 'ammu', name: 'Ammu', color: '#000000'},
];

/** Thu Oct 15 2026 at `h:m`, local time. Tomorrow is a Friday, a school day. */
const thu = (h: number, m = 0) => new Date(2026, 9, 15, h, m);

describe('bedtime', () => {
  it("ends by a kid's bedtime when the kid is here", () => {
    const limit = tonightLimit(PROFILES, ['rafi', 'nanu'], [], thu(18));
    assert.deepEqual(limit, {at: thu(20, 30), reason: "Rafi's bedtime"});
    assert.equal(tonightLimit(PROFILES, ['nanu', 'ammu'], [], thu(18)), null, 'no kid, no early start: no limit');
  });

  it('gives an extra hour when tomorrow is the weekend', () => {
    const fri = new Date(2026, 9, 16, 18);
    assert.deepEqual(tonightLimit(PROFILES, ['rafi'], [], fri)?.at, new Date(2026, 9, 16, 21, 30));
  });

  it('plans around an early event tomorrow for someone here', () => {
    const events = [
      {id: 'e1', title: 'Flight', start: new Date(2026, 9, 16, 7, 0).toISOString(), profileIds: ['ammu']},
      {id: 'e2', title: 'Late', start: new Date(2026, 9, 16, 11, 0).toISOString(), profileIds: ['ammu']},
    ];
    // 7:00 minus 10.5 hours: 20:30, but it's Ammu's event, so only when Ammu is here.
    assert.deepEqual(tonightLimit(PROFILES, ['ammu'], events, thu(18)), {at: thu(20, 30), reason: 'Flight at 7:00 tomorrow'});
    assert.equal(tonightLimit(PROFILES, ['nanu'], events, thu(18)), null);
  });

  it('only plans a few hours ahead, and not after the time has passed', () => {
    assert.equal(tonightLimit(PROFILES, ['rafi'], [], thu(10)), null);
    assert.equal(tonightLimit(PROFILES, ['rafi'], [], thu(21)), null);
  });

  it('drops picks that run long and tops up from the extras', () => {
    const p = (title: string, minutes?: number): TonightPick => ({title, why: 'x', ...(minutes ? {minutes} : {})});
    const out = fitPicks([p('Long', 150), p('Short', 90), p('Series')], [p('Short'), p('Extra', 80), p('Extra 2', 85)], 100);
    assert.deepEqual(out.map(x => x.title), ['Short', 'Series', 'Extra']);
    // Nothing fits: the shortest ones still make three picks.
    assert.deepEqual(fitPicks([p('A', 150), p('B', 120)], [p('C', 130)], 30).map(x => x.title), ['B', 'C', 'A']);
  });

  it('the mock picks titles that finish in time', () => {
    const picks = mockTonight([{id: 'rafi', name: 'Rafi'}], 'funny', 100);
    assert.equal(picks.length, 3);
    assert.ok(picks.every(x => x.minutes! <= 100), picks.map(x => `${x.title} ${x.minutes}`).join(', '));
  });
});

describe('secret veto engine', () => {
  function engine(voters: string[]) {
    const states: any[] = [];
    const decided: Array<number | undefined> = [];
    const e = new VoteEngine({
      now: () => 0,
      votingMs: 10_000,
      suddenDeathMs: 10_000,
      voters: () => voters,
      onState: s => states.push(s),
      onDecided: w => decided.push(w),
    });
    return {e, states, decided, last: () => states[states.length - 1]};
  }

  it('reveals only the picks everyone accepted, never a ballot', () => {
    const {e, decided, states, last} = engine(['a', 'b', 'c']);
    e.start('v1', 3);
    assert.equal(e.vote('v1', 'a', [0, 2]), 'ok');
    assert.deepEqual(last().voted, ['a']);
    e.vote('v1', 'b', [2, 1]);
    assert.equal(e.vote('v1', 'b', [0]), 'already');
    e.vote('v1', 'c', [0, 1, 2]);
    assert.equal(last().phase, 'result');
    assert.deepEqual(last().accepted, [2]);
    assert.equal(last().winner, 2);
    assert.equal(last().decidedBy, 'everyone');
    assert.deepEqual(decided, [2]);
    // No state ever carries who voted for what.
    assert.ok(states.every(s => !('ballots' in s) && !('counts' in s)));
    e.dispose();
  });

  it('goes to sudden death between the top two when nothing is accepted by all', () => {
    const {e, decided, last} = engine(['a', 'b', 'c']);
    e.start('v1', 3);
    e.vote('v1', 'a', [0, 1]);
    e.vote('v1', 'b', [1]);
    e.vote('v1', 'c', [2]);
    assert.equal(last().phase, 'sudden-death');
    // Pick 1 has two yes votes; 0 and 2 tie on one, so pick order keeps 0.
    assert.deepEqual(last().options, [0, 1]);
    assert.deepEqual(last().voted, []);
    assert.equal(e.vote('v1', 'a', [2]), 'invalid', 'only the two finalists');
    assert.equal(e.vote('v1', 'a', [0, 1]), 'invalid', 'exactly one in sudden death');
    e.vote('v1', 'a', [0]);
    e.vote('v1', 'b', [1]);
    // A tie in sudden death goes to the pick more people liked in round one.
    assert.equal(e.next('v1'), true);
    assert.equal(last().winner, 1);
    assert.equal(last().decidedBy, 'sudden-death');
    assert.deepEqual(decided, [1]);
    e.dispose();
  });

  it('decides nothing when nobody voted, and a reset ends the vote', () => {
    const {e, decided, last} = engine(['a']);
    e.start('v1', 3);
    e.next('v1');
    assert.equal(last().decidedBy, 'nobody');
    assert.equal(last().winner, undefined);
    assert.deepEqual(decided, [undefined]);
    e.start('v2', 3);
    assert.equal(e.vote('v1', 'a', [0]), 'stale');
    e.reset();
    assert.equal(last().phase, 'idle');
    e.dispose();
  });
});

describe('secret veto over the wire', () => {
  let server: TestServer;
  let n = 0;

  before(async () => {
    server = await startServer({ai: new MockAI({delayMs: 0}), voteMs: 2000, suddenDeathMs: 2000});
  });
  after(async () => {
    await server.close();
  });

  async function untilVote(c: TestClient, phase: string) {
    for (;;) {
      const f = await c.nextOf('tonight:vote-state', 2000);
      if (f.payload.phase === phase) return f.payload;
    }
  }

  it('phones vote in private, the TV sees who voted, the overlap becomes the pick', async () => {
    const hh = `veto-${++n}`;
    const {tv, pair} = await claimTv(server.url, hh);
    const {phone: rafi} = await pairPhone(server.url, pair.code, {client: {clientId: 'p-rafi', role: 'phone', profileId: 'rafi'}}, hh);
    const {phone: nanu} = await pairPhone(server.url, pair.code, {client: {clientId: 'p-nanu', role: 'phone', profileId: 'nanu'}}, hh);

    tv.send('tonight:vote-start', {});
    assert.equal((await tv.nextOf('error')).payload.message, 'get Tonight picks before you vote');

    tv.send('tonight:request', {mood: 'cozy'});
    const picks = (await tv.nextOf('tonight:picks')).payload;
    tv.send('tonight:vote-start', {});
    const voting = await untilVote(tv, 'voting');
    assert.deepEqual(voting.options, [0, 1, 2]);

    rafi.send('tonight:vote', {voteId: voting.voteId, yes: [0, 1]});
    const progress = await untilVote(tv, 'voting');
    assert.deepEqual(progress.voted, ['rafi']);
    assert.equal(JSON.stringify(progress).includes('"yes"'), false);
    nanu.send('tonight:vote', {voteId: voting.voteId, yes: [1, 2]});
    const result = await untilVote(tv, 'result');
    assert.deepEqual(result.accepted, [1]);
    const chosen = (await tv.nextOf('tonight:picks')).payload;
    assert.equal(chosen.chosen, 1);
    assert.equal(chosen.picks[1].title, picks.picks[1].title);
    assert.equal(server.hub.household(hh)!.tonight!.chosen, 1);

    // New picks end the vote.
    tv.send('tonight:request', {mood: 'funny'});
    assert.equal((await untilVote(tv, 'idle')).voteId, null);
    for (const c of [tv, rafi, nanu]) c.close();
  });
});

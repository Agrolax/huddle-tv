import {after, before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {QUIZ_CHOICES, QUIZ_ROUNDS} from '@huddle/shared';
import {HouseholdAI, MockAI, QuizContext, QuizResult} from '../src/ai/index.js';
import {demoHousehold} from '../src/household.js';
import {ourWeekQuestions} from '../src/quiz/ourWeek.js';
import {QuizItem, parseQuizJson, q, sanitizeQuiz, shuffleChoices} from '../src/quiz/questions.js';
import {MOVIE_TRIVIA, knownMockTitles, mockWatchedIt} from '../src/quiz/watchedIt.js';
import {TestClient, TestServer, claimTv, pairPhone, startServer} from './helpers.js';

/** Deterministic random for shuffles. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function wellFormed(item: QuizItem): void {
  assert.equal(item.choices.length, QUIZ_CHOICES);
  assert.equal(new Set(item.choices).size, QUIZ_CHOICES, `duplicate choices in "${item.text}"`);
  assert.ok(item.answer >= 0 && item.answer < QUIZ_CHOICES);
  assert.ok(item.text.endsWith('?'), item.text);
}

describe('quiz questions', () => {
  const thu = new Date(2026, 9, 15, 12);

  it('Our Week builds five well-formed questions from the household', () => {
    const items = ourWeekQuestions(demoHousehold('home', thu.getTime()), thu, seeded());
    assert.equal(items.length, QUIZ_ROUNDS);
    items.forEach(wellFormed);
  });

  it('Our Week answers match the household data', () => {
    const snap = demoHousehold('home', thu.getTime(), {place: 'Toronto', tempC: 9, code: 3, highC: 12, lowC: 4, updatedAt: thu.toISOString()});
    snap.messages = [{id: 'm1', text: 'Pizza night 🍕', fromProfileId: 'nora', fromClient: 'phone', at: thu.toISOString()}];
    // Several seeds, so every kind of question shows up at least once.
    const all = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(seed => ourWeekQuestions(snap, thu, seeded(seed)));
    const right = (text: string) => all.filter(i => i.text === text).map(i => i.choices[i.answer]);
    assert.ok(right('Who has Dentist tomorrow?').every(a => a === 'Maya'));
    assert.ok(right('Who has Soccer practice on Saturday?').every(a => a === 'Leo'));
    assert.ok(right('When is Dentist?').every(a => a === 'Tomorrow'));
    assert.ok(right('Who sent “Pizza night 🍕”?').every(a => a === 'Nora'));
    assert.ok(right('What is the high today in Toronto?').every(a => a === '12°'));
    assert.ok(right('What is the thermostat set to?').every(a => a === '21°'));
    assert.ok(all.length > 0);
  });

  it('an event a week away is "next <weekday>", so it never looks like today', () => {
    const sat = new Date(2026, 9, 17, 12);
    const snap = demoHousehold('home', sat.getTime());
    const all = [1, 2, 3, 4, 5, 6].flatMap(seed => ourWeekQuestions(snap, sat, seeded(seed)));
    const when = all.filter(i => i.text === 'When is Soccer practice?');
    assert.ok(when.every(i => i.choices[i.answer] === 'Next Saturday'));
    assert.ok(all.filter(i => i.text.startsWith('Who has Soccer')).every(i => i.text === 'Who has Soccer practice next Saturday?'));
  });

  it('Our Week still has five questions in an empty week', () => {
    const snap = demoHousehold('home', thu.getTime());
    snap.events = [];
    const items = ourWeekQuestions(snap, thu, seeded());
    assert.equal(items.length, QUIZ_ROUNDS);
    items.forEach(wellFormed);
  });

  it('every mock Watched It set is well formed', () => {
    for (const title of knownMockTitles()) {
      const items = mockWatchedIt(title)!;
      assert.equal(items.length, QUIZ_ROUNDS, title);
      items.forEach(wellFormed);
    }
    MOVIE_TRIVIA.forEach(wellFormed);
    assert.equal(mockWatchedIt('  Paddington 2 '), mockWatchedIt('paddington 2'));
    assert.equal(mockWatchedIt('Some New Film'), null);
  });

  it('the mock AI renames unknown titles to movie trivia', async () => {
    const ai = new MockAI({delayMs: 0});
    assert.equal((await ai.quiz({title: 'Knives Out', people: [], now: thu})).title, 'Knives Out');
    assert.deepEqual(await ai.quiz({title: 'Some New Film', people: [], now: thu}), {title: 'Movie trivia', items: MOVIE_TRIVIA});
  });

  it('shuffling keeps the right answer', () => {
    const item = q('Which food does Paddington love most?', 'Marmalade', 'Honey', 'Cheese', 'Jam');
    for (let seed = 1; seed < 20; seed++) {
      const s = shuffleChoices(item, seeded(seed));
      assert.equal(s.choices[s.answer], 'Marmalade');
      assert.deepEqual([...s.choices].sort(), [...item.choices].sort());
    }
  });

  it('parses model JSON defensively', () => {
    const good = {question: 'Who is the detective?', choices: ['Blanc', 'Poirot', 'Holmes', 'Marple'], answer: 0};
    const text = `Sure! {"questions":[${JSON.stringify(good)},${JSON.stringify({...good, answer: 7})},${JSON.stringify({...good, choices: ['a', 'a', 'b', 'c']})},${JSON.stringify({...good, choices: ['a']})}]}`;
    assert.deepEqual(parseQuizJson(text), [{text: 'Who is the detective?', choices: ['Blanc', 'Poirot', 'Holmes', 'Marple'], answer: 0}]);
    assert.deepEqual(parseQuizJson('no json here'), []);
    assert.deepEqual(sanitizeQuiz([{text: 'x'.repeat(300) + '?', choices: ['a', 'b', 'c', 'd'], answer: '2'}])[0]!.answer, 2);
    assert.equal(sanitizeQuiz([{text: 'x'.repeat(300), choices: ['a', 'b', 'c', 'd'], answer: 1}])[0]!.text.length, 140);
  });
});

/** An AI whose quiz each test controls; tonight/chat are not used here. */
class QuizAI implements HouseholdAI {
  readonly source = 'bedrock' as const;
  calls: QuizContext[] = [];
  impl: (ctx: QuizContext) => Promise<QuizResult> = async ctx => ({title: ctx.title, items: MOVIE_TRIVIA});
  async tonight() {
    return [];
  }
  async *chat() {}
  quiz(ctx: QuizContext) {
    this.calls.push(ctx);
    return this.impl(ctx);
  }
}

describe('game night over the wire', () => {
  let server: TestServer;
  const ai = new QuizAI();
  let n = 0;

  before(async () => {
    server = await startServer({ai, fallbackAI: new MockAI({delayMs: 0}), quizQuestionMs: 400, quizRevealMs: 150});
  });
  after(async () => {
    await server.close();
  });

  /** A TV and phones bound to people, in a fresh household. */
  async function room(...people: string[]) {
    const hh = `game-${++n}`;
    const {tv, pair} = await claimTv(server.url, hh);
    const phones: TestClient[] = [];
    for (const profileId of people) {
      const {phone} = await pairPhone(server.url, pair.code, {client: {clientId: `phone-${profileId}`, role: 'phone', profileId}}, hh);
      phones.push(phone);
    }
    return {hh, tv, phones, close: () => [tv, ...phones].forEach(c => c.close())};
  }

  async function untilPhase(c: TestClient, phase: string, timeoutMs = 2000) {
    for (;;) {
      const f = await c.nextOf('game:state', timeoutMs);
      if (f.payload.phase === phase) return f.payload;
    }
  }

  it('runs an Our Week quiz: questions hide the answer, the reveal scores, the league updates', async () => {
    const {hh, tv, phones, close} = await room('leo', 'nora');
    const [leo, nora] = phones as [TestClient, TestClient];
    tv.send('game:start', {kind: 'quiz', source: 'our-week'});
    assert.equal((await untilPhase(tv, 'loading')).title, 'Our Week');
    const question = await untilPhase(tv, 'question');
    assert.equal(question.round, 1);
    assert.equal(question.rounds, QUIZ_ROUNDS);
    assert.equal(question.question.choices.length, QUIZ_CHOICES);
    assert.equal(question.correct, undefined, 'the answer must not leak before the reveal');

    // Leo answers 0, Nora answers 1: exactly one of them can be right unless neither is.
    leo.send('game:answer', {gameId: question.gameId, round: 1, choice: 0});
    const afterRafi = await untilPhase(tv, 'question');
    assert.deepEqual(afterRafi.answered, ['leo']);
    nora.send('game:answer', {gameId: question.gameId, round: 1, choice: 1});
    // Everyone with a phone answered, so the reveal comes before the timer.
    const reveal = await untilPhase(tv, 'reveal', 300);
    assert.equal(typeof reveal.correct, 'number');
    assert.deepEqual(reveal.choices, {leo: 0, nora: 1});
    for (const id of ['leo', 'nora']) {
      const right = reveal.choices[id] === reveal.correct;
      // The test clock stands still, so a right answer is worth the full 1000.
      assert.equal(reveal.gained[id], right ? 1000 : 0);
    }

    // Nobody answers the rest; the timers run the game to the end.
    const final = await untilPhase(tv, 'final', 5000);
    assert.deepEqual(final.scores, reveal.scores);
    const league = (await tv.nextOf('league:updated')).payload;
    assert.equal(league.leo.games, 1);
    assert.equal(league.nora.games, 1);
    assert.equal(server.hub.household(hh)!.league.leo!.points, reveal.scores.leo);
    assert.equal(server.hub.household(hh)!.game.phase, 'final');
    close();
  });

  it('Watched It asks the AI about the latest Tonight pick or the title sent', async () => {
    const {tv, phones, close} = await room('leo');
    phones[0]!.send('game:start', {kind: 'quiz', source: 'watched-it', title: 'Up'});
    const state = await untilPhase(tv, 'question');
    assert.equal(state.title, 'Watched It: Up');
    assert.equal(state.aiSource, 'bedrock');
    assert.equal(ai.calls.at(-1)!.title, 'Up');
    tv.send('game:end', {gameId: state.gameId});
    assert.equal((await tv.nextOf('game:state')).payload.phase, 'idle');
    close();
  });

  it('falls back to the mock when the AI fails', async () => {
    ai.impl = async () => {
      throw new Error('throttled');
    };
    const {tv, close} = await room('leo');
    tv.send('game:start', {kind: 'quiz', source: 'watched-it', title: 'Knives Out'});
    const state = await untilPhase(tv, 'question');
    assert.equal(state.aiSource, 'mock');
    assert.equal(state.title, 'Watched It: Knives Out');
    ai.impl = async ctx => ({title: ctx.title, items: MOVIE_TRIVIA});
    tv.send('game:end', {gameId: state.gameId});
    close();
  });

  it('rejects a second start, late or repeated answers, and phones without a person', async () => {
    const {hh, tv, phones, close} = await room('leo', 'nora');
    tv.send('game:start', {kind: 'quiz', source: 'our-week'});
    const question = await untilPhase(tv, 'question');
    tv.send('game:start', {kind: 'quiz', source: 'our-week'});
    assert.equal((await tv.nextOf('error')).payload.code, 'busy');

    const leo = phones[0]!;
    leo.send('game:answer', {gameId: question.gameId, round: 1, choice: 2});
    leo.send('game:answer', {gameId: question.gameId, round: 1, choice: 3});
    assert.equal((await leo.nextOf('error')).payload.message, 'already answered');
    leo.send('game:answer', {gameId: question.gameId, round: 2, choice: 0});
    assert.equal((await leo.nextOf('error')).payload.message, 'that question is closed');

    const pair = await (async () => {
      tv.send('pair:request', {});
      return (await tv.nextOf('pair:code')).payload.code as string;
    })();
    const {phone: anon} = await pairPhone(server.url, pair, {}, hh);
    anon.send('game:answer', {gameId: question.gameId, round: 1, choice: 0});
    assert.match((await anon.nextOf('error')).payload.message, /select who you are/);

    tv.send('game:answer', {gameId: question.gameId, round: 1, choice: 0});
    assert.equal((await tv.nextOf('error')).payload.code, 'forbidden');

    tv.send('game:end', {gameId: question.gameId});
    close();
    anon.close();
  });

  it('game:next skips the timer, and ending early leaves the league alone', async () => {
    const {hh, tv, close} = await room('leo');
    tv.send('game:start', {kind: 'quiz', source: 'our-week'});
    const question = await untilPhase(tv, 'question');
    tv.send('game:next', {gameId: question.gameId});
    assert.equal((await untilPhase(tv, 'reveal', 200)).round, 1);
    tv.send('game:next', {gameId: question.gameId});
    assert.equal((await untilPhase(tv, 'question', 200)).round, 2);
    tv.send('game:end', {gameId: question.gameId});
    assert.equal((await untilPhase(tv, 'idle')).gameId, null);
    assert.deepEqual(server.hub.household(hh)!.league, {});
    tv.send('game:next', {gameId: question.gameId});
    assert.equal((await tv.nextOf('error')).payload.code, 'bad-request');
    close();
  });

  it('a phone that joins mid-game gets the game in its welcome', async () => {
    const {hh, tv, close} = await room();
    tv.send('game:start', {kind: 'quiz', source: 'our-week'});
    const question = await untilPhase(tv, 'question');
    tv.send('pair:request', {});
    const code = (await tv.nextOf('pair:code')).payload.code;
    const {phone, welcome} = await pairPhone(server.url, code, {client: {clientId: 'late', role: 'phone', profileId: 'sam'}}, hh);
    assert.equal(welcome.payload.snapshot.game.phase, 'question');
    assert.equal(welcome.payload.snapshot.game.correct, undefined);
    phone.send('game:answer', {gameId: question.gameId, round: 1, choice: 0});
    assert.deepEqual((await untilPhase(tv, 'reveal', 300)).answered, ['sam']);
    tv.send('game:end', {gameId: question.gameId});
    phone.close();
    close();
  });
});

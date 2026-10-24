import {IDLE_GAME, addToLeague, choiceLetter, gameIsLive, quizPoints, standings, validateGameAnswer, validateGameRef, validateGameStart} from '../src';

describe('quiz scoring', () => {
  it('pays 500 for a right answer plus up to 500 for speed', () => {
    expect(quizPoints(true, 20_000, 20_000)).toBe(1000);
    expect(quizPoints(true, 10_000, 20_000)).toBe(750);
    expect(quizPoints(true, 0, 20_000)).toBe(500);
    expect(quizPoints(true, -5, 20_000)).toBe(500);
    expect(quizPoints(false, 20_000, 20_000)).toBe(0);
  });

  it('letters choices A–D', () => {
    expect([0, 1, 2, 3].map(choiceLetter).join('')).toBe('ABCD');
  });

  it('ranks with shared places for ties', () => {
    expect(standings({nora: 900, leo: 1500, maya: 900, sam: 0}, ['leo', 'nora', 'maya', 'sam'])).toEqual([
      {profileId: 'leo', points: 1500, place: 1},
      {profileId: 'nora', points: 900, place: 2},
      {profileId: 'maya', points: 900, place: 2},
      {profileId: 'sam', points: 0, place: 4},
    ]);
  });

  it('adds a game to the league: points, games and wins (ties all win)', () => {
    const once = addToLeague({}, {scores: {leo: 800, nora: 800, maya: 0}});
    expect(once).toEqual({
      leo: {points: 800, wins: 1, games: 1},
      nora: {points: 800, wins: 1, games: 1},
      maya: {points: 0, wins: 0, games: 1},
    });
    expect(addToLeague(once, {scores: {maya: 300}}).maya).toEqual({points: 300, wins: 1, games: 2});
    expect(addToLeague(once, {scores: {}})).toBe(once);
  });

  it('nobody wins a game where everyone scored 0', () => {
    expect(addToLeague({}, {scores: {leo: 0}}).leo!.wins).toBe(0);
  });

  it('knows when a game is live', () => {
    expect(gameIsLive(IDLE_GAME)).toBe(false);
    expect(gameIsLive({...IDLE_GAME, phase: 'question'})).toBe(true);
    expect(gameIsLive({...IDLE_GAME, phase: 'final'})).toBe(false);
  });
});

describe('game validators', () => {
  it('game:start needs a quiz kind and a known source', () => {
    expect(validateGameStart({kind: 'quiz', source: 'our-week'})).toEqual({ok: true, value: {kind: 'quiz', source: 'our-week'}});
    expect(validateGameStart({kind: 'quiz', source: 'watched-it', title: '  Up  '})).toEqual({
      ok: true,
      value: {kind: 'quiz', source: 'watched-it', title: 'Up'},
    });
    expect(validateGameStart({kind: 'trivia', source: 'our-week'}).ok).toBe(false);
    expect(validateGameStart({kind: 'quiz', source: 'trivia'}).ok).toBe(false);
    expect(validateGameStart({kind: 'quiz', source: 'our-week', title: 'x'.repeat(81)}).ok).toBe(false);
  });

  it('game:answer checks the round and the choice range', () => {
    expect(validateGameAnswer({gameId: 'g1', round: 2, choice: 3})).toEqual({ok: true, value: {gameId: 'g1', round: 2, choice: 3}});
    expect(validateGameAnswer({gameId: 'g1', round: 1, choice: 0, profileId: 'nora'}).ok).toBe(true);
    expect(validateGameAnswer({gameId: 'g1', round: 0, choice: 0}).ok).toBe(false);
    expect(validateGameAnswer({gameId: 'g1', round: 1, choice: 4}).ok).toBe(false);
    expect(validateGameAnswer({gameId: 'g1', round: 1, choice: 1.5}).ok).toBe(false);
    expect(validateGameAnswer({gameId: 'bad id', round: 1, choice: 0}).ok).toBe(false);
  });

  it('game:next and game:end need a game id', () => {
    expect(validateGameRef('game:next', {gameId: 'g1'})).toEqual({ok: true, value: {gameId: 'g1'}});
    expect(validateGameRef('game:end', {}).ok).toBe(false);
  });
});

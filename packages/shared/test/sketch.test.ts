import {guessMatches, normalizeTitle, titleHint, validateGameStart, validateSketchGuess, validateSketchStroke, validateTonightVote, validateVoteRef} from '../src';

describe('Sketch the pick helpers', () => {
  it('hides letters but keeps digits, spaces and punctuation', () => {
    expect(titleHint('Paddington 2')).toBe('__________ 2');
    expect(titleHint('Top Gun: Maverick')).toBe('___ ___: ________');
    expect(titleHint('Up')).toBe('__');
  });

  it('normalizes titles', () => {
    expect(normalizeTitle('The Mitchells vs. the Machines')).toBe('mitchells vs the machines');
    expect(normalizeTitle('Wallace & Gromit')).toBe('wallace gromit');
    expect(normalizeTitle('Paddington Two')).toBe('paddington 2');
    expect(normalizeTitle('Pokémon')).toBe('pokemon');
  });

  it('accepts close guesses and the part before a colon', () => {
    expect(guessMatches('paddington 2', 'Paddington 2')).toBe(true);
    expect(guessMatches('Paddington two', 'Paddington 2')).toBe(true);
    expect(guessMatches('padington 2', 'Paddington 2')).toBe(true);
    expect(guessMatches('paddington', 'Paddington 2')).toBe(true);
    expect(guessMatches('totoro', 'My Neighbor Totoro')).toBe(true);
    expect(guessMatches('night', 'Game Night')).toBe(true);
    expect(guessMatches('great', 'The Great British Baking Show')).toBe(false);
    expect(guessMatches('baking', 'The Great British Baking Show')).toBe(true);
    expect(guessMatches('neighbor toto', 'My Neighbor Totoro')).toBe(false);
    expect(guessMatches('wallace and gromit', 'Wallace & Gromit: Vengeance Most Fowl')).toBe(true);
    expect(guessMatches('top gun', 'Top Gun: Maverick')).toBe(true);
    expect(guessMatches('mitchells vs the machines', 'The Mitchells vs. the Machines')).toBe(true);
    expect(guessMatches('upp', 'Up')).toBe(false);
    expect(guessMatches('', 'Up')).toBe(false);
  });
});

describe('vote and sketch validators', () => {
  it('game:start takes a sketch', () => {
    expect(validateGameStart({kind: 'sketch'})).toEqual({ok: true, value: {kind: 'sketch'}});
  });

  it('tonight:vote', () => {
    expect(validateTonightVote({voteId: 'v1', yes: [0, 2, 2]})).toEqual({ok: true, value: {voteId: 'v1', yes: [0, 2]}});
    expect(validateTonightVote({voteId: 'v1', yes: []}).ok).toBe(true);
    expect(validateTonightVote({voteId: 'v1', yes: [1.5]}).ok).toBe(false);
    expect(validateTonightVote({voteId: 'v 1', yes: [0]}).ok).toBe(false);
    expect(validateVoteRef('tonight:vote-next', {voteId: 'v1'}).ok).toBe(true);
    expect(validateVoteRef('tonight:vote-end', {}).ok).toBe(false);
  });

  it('sketch:stroke', () => {
    const stroke = {id: 's1', color: '#3D8BFF', width: 0.01, points: [{x: 0, y: 1}]};
    expect(validateSketchStroke({gameId: 'g1', round: 1, stroke}).ok).toBe(true);
    expect(validateSketchStroke({gameId: 'g1', round: 1, stroke: {...stroke, color: 'red'}}).ok).toBe(false);
    expect(validateSketchStroke({gameId: 'g1', round: 1, stroke: {...stroke, points: [{x: 2, y: 0}]}}).ok).toBe(false);
    expect(validateSketchStroke({gameId: 'g1', round: 1, stroke: {...stroke, points: []}}).ok).toBe(false);
    expect(validateSketchStroke({gameId: 'g1', round: 0, stroke}).ok).toBe(false);
    const extra = validateSketchStroke({gameId: 'g1', round: 1, stroke: {...stroke, points: [{x: 0, y: 0, z: 1}], evil: true}});
    expect(extra.ok && extra.value.stroke).toEqual({...stroke, points: [{x: 0, y: 0}]});
  });

  it('sketch:guess', () => {
    expect(validateSketchGuess({gameId: 'g1', round: 2, text: '  Up '})).toEqual({ok: true, value: {gameId: 'g1', round: 2, text: 'Up'}});
    expect(validateSketchGuess({gameId: 'g1', round: 2, text: ' '}).ok).toBe(false);
    expect(validateSketchGuess({gameId: 'g1', round: 2, text: 'x'.repeat(61)}).ok).toBe(false);
  });
});

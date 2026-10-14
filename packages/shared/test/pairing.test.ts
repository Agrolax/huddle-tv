import {
  PAIR_CODE_ALPHABET,
  PAIR_CODE_LENGTH,
  buildJoinUrl,
  formatPairCode,
  generatePairCode,
  isPairCode,
  normalizePairCode,
  parseJoinParams,
  queryParam,
} from '../src/pairing';

describe('pair codes', () => {
  it('generates codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generatePairCode();
      expect(code).toHaveLength(PAIR_CODE_LENGTH);
      expect([...code].every(ch => PAIR_CODE_ALPHABET.includes(ch))).toBe(true);
      expect(isPairCode(code)).toBe(true);
    }
    expect(PAIR_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('uses the random source it is given', () => {
    expect(generatePairCode(() => 0)).toBe('222222');
    expect(generatePairCode(() => 0.9999)).toBe('ZZZZZZ');
  });

  it('normalises what people type', () => {
    expect(normalizePairCode('h7k-2qp')).toBe('H7K2QP');
    expect(isPairCode('h7k 2qp')).toBe(true);
    expect(isPairCode('H7K2Q')).toBe(false);
    expect(isPairCode('H7K2Q0')).toBe(false); // 0 is not in the alphabet
  });

  it('formats for the TV', () => {
    expect(formatPairCode('H7K2QP')).toBe('H7K 2QP');
  });
});

describe('join URLs', () => {
  it('builds and parses a round trip', () => {
    const url = buildJoinUrl('http://10.0.0.5:5173/', 'demo', 'H7K2QP');
    expect(url).toBe('http://10.0.0.5:5173/?h=demo&c=H7K2QP');
    expect(parseJoinParams(url.slice(url.indexOf('?')))).toEqual({householdId: 'demo', pairCode: 'H7K2QP'});
  });

  it('keeps existing query and hash', () => {
    expect(buildJoinUrl('https://x.test/app?v=2#/join', 'hh 1', 'ABCDEF')).toBe('https://x.test/app?v=2&h=hh%201&c=ABCDEF#/join');
  });

  it('rejects missing or bad params', () => {
    expect(parseJoinParams('')).toBeNull();
    expect(parseJoinParams('?h=demo')).toBeNull();
    expect(parseJoinParams('?h=demo&c=nope')).toBeNull();
    expect(parseJoinParams('?h=demo&c=%E0%A4%A')).toBeNull();
    expect(parseJoinParams('h=demo&c=h7k2qp')).toEqual({householdId: 'demo', pairCode: 'H7K2QP'});
  });

  it('queryParam decodes', () => {
    expect(queryParam('?a=1&b=hello+world%21', 'b')).toBe('hello world!');
    expect(queryParam('?a=1', 'b')).toBeUndefined();
  });
});

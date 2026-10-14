import {
  buildNeighborMap,
  getNeighbor,
  gridSize,
  GridCell,
  moveInRow,
  readingOrder,
  rememberFocus,
  validateGrid,
} from '../src/grid';

/**
 * The Huddle home layout (4 columns × 2 rows):
 *
 *   ┌───────┬───────────────┬─────────┐
 *   │ clock │   calendar    │ profiles│
 *   ├───────┴───────┬───────┼─────────┤
 *   │    tonight    │ sketch│  smart  │
 *   └───────────────┴───────┴─────────┘
 */
const HOME: GridCell[] = [
  {id: 'clock', row: 0, col: 0},
  {id: 'calendar', row: 0, col: 1, colSpan: 2},
  {id: 'profiles', row: 0, col: 3},
  {id: 'tonight', row: 1, col: 0, colSpan: 2},
  {id: 'sketch', row: 1, col: 2},
  {id: 'smart', row: 1, col: 3},
];

describe('getNeighbor', () => {
  it('moves left and right within a row', () => {
    expect(getNeighbor(HOME, 'clock', 'right')).toBe('calendar');
    expect(getNeighbor(HOME, 'calendar', 'right')).toBe('profiles');
    expect(getNeighbor(HOME, 'profiles', 'left')).toBe('calendar');
    expect(getNeighbor(HOME, 'sketch', 'left')).toBe('tonight');
  });

  it('returns undefined at an edge so native focus can leave the grid', () => {
    expect(getNeighbor(HOME, 'clock', 'left')).toBeUndefined();
    expect(getNeighbor(HOME, 'clock', 'up')).toBeUndefined();
    expect(getNeighbor(HOME, 'smart', 'down')).toBeUndefined();
    expect(getNeighbor(HOME, 'profiles', 'right')).toBeUndefined();
  });

  it('moves down to the cell with the most column overlap', () => {
    expect(getNeighbor(HOME, 'clock', 'down')).toBe('tonight');
    expect(getNeighbor(HOME, 'profiles', 'down')).toBe('smart');
    // calendar spans cols 1-2: overlaps tonight (col 1) and sketch (col 2) equally → leftmost.
    expect(getNeighbor(HOME, 'calendar', 'down')).toBe('tonight');
  });

  it('moves up the same way', () => {
    expect(getNeighbor(HOME, 'sketch', 'up')).toBe('calendar');
    expect(getNeighbor(HOME, 'tonight', 'up')).toBe('clock');
    expect(getNeighbor(HOME, 'smart', 'up')).toBe('profiles');
  });

  it('prefers the remembered cell in the target row', () => {
    const memory = rememberFocus({}, HOME, 'sketch');
    expect(getNeighbor(HOME, 'calendar', 'down', {memory})).toBe('sketch');
    // Memory only applies when the remembered cell is in the nearest row band.
    expect(getNeighbor(HOME, 'tonight', 'up', {memory})).toBe('clock');
  });

  it('ignores a remembered cell that is not above or below the source', () => {
    const memory = rememberFocus({}, HOME, 'profiles');
    expect(getNeighbor(HOME, 'tonight', 'up', {memory})).toBe('clock');
    expect(getNeighbor(HOME, 'smart', 'up', {memory})).toBe('profiles');
  });

  it('ignores memory that points outside the reachable band', () => {
    const memory = {1: 'profiles'};
    expect(getNeighbor(HOME, 'clock', 'down', {memory})).toBe('tonight');
  });

  it('never dead-ends when the next row is shorter', () => {
    const cells: GridCell[] = [
      {id: 'a', row: 0, col: 0},
      {id: 'b', row: 0, col: 1},
      {id: 'c', row: 0, col: 2},
      {id: 'd', row: 1, col: 0},
    ];
    expect(getNeighbor(cells, 'c', 'down')).toBe('d');
  });

  it('skips empty rows', () => {
    const cells: GridCell[] = [
      {id: 'top', row: 0, col: 0},
      {id: 'bottom', row: 3, col: 0},
    ];
    expect(getNeighbor(cells, 'top', 'down')).toBe('bottom');
    expect(getNeighbor(cells, 'bottom', 'up')).toBe('top');
  });

  it('skips disabled cells', () => {
    const cells: GridCell[] = [
      {id: 'a', row: 0, col: 0},
      {id: 'b', row: 0, col: 1, disabled: true},
      {id: 'c', row: 0, col: 2},
    ];
    expect(getNeighbor(cells, 'a', 'right')).toBe('c');
  });

  it('handles tall cells that span rows', () => {
    const cells: GridCell[] = [
      {id: 'tall', row: 0, col: 0, rowSpan: 2},
      {id: 'r0', row: 0, col: 1},
      {id: 'r1', row: 1, col: 1},
      {id: 'below', row: 2, col: 0, colSpan: 2},
    ];
    expect(getNeighbor(cells, 'tall', 'right')).toBe('r0');
    expect(getNeighbor(cells, 'r1', 'left')).toBe('tall');
    expect(getNeighbor(cells, 'tall', 'down')).toBe('below');
    expect(getNeighbor(cells, 'r0', 'down')).toBe('r1');
    expect(getNeighbor(cells, 'below', 'up')).toBe('tall');
  });

  it('wraps rows only when asked', () => {
    expect(getNeighbor(HOME, 'profiles', 'right', {wrapRows: true})).toBe('clock');
    expect(getNeighbor(HOME, 'tonight', 'left', {wrapRows: true})).toBe('smart');
  });

  it('returns undefined for an unknown id', () => {
    expect(getNeighbor(HOME, 'nope', 'down')).toBeUndefined();
  });
});

describe('buildNeighborMap', () => {
  it('has an entry for every cell and no self references', () => {
    const map = buildNeighborMap(HOME);
    expect(Object.keys(map).sort()).toEqual(HOME.map(c => c.id).sort());
    for (const [id, n] of Object.entries(map)) {
      expect(Object.values(n)).not.toContain(id);
    }
  });

  it('every cell is reachable from the first cell', () => {
    const map = buildNeighborMap(HOME);
    const seen = new Set<string>(['clock']);
    const queue = ['clock'];
    while (queue.length) {
      const id = queue.shift()!;
      for (const next of Object.values(map[id] ?? {})) {
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect(seen.size).toBe(HOME.length);
  });
});

describe('validateGrid', () => {
  it('accepts the home layout', () => {
    expect(() => validateGrid(HOME)).not.toThrow();
  });

  it('rejects overlapping cells', () => {
    expect(() =>
      validateGrid([
        {id: 'a', row: 0, col: 0, colSpan: 2},
        {id: 'b', row: 0, col: 1},
      ]),
    ).toThrow(/overlap/);
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      validateGrid([
        {id: 'a', row: 0, col: 0},
        {id: 'a', row: 0, col: 1},
      ]),
    ).toThrow(/Duplicate/);
  });
});

describe('helpers', () => {
  it('gridSize counts spans', () => {
    expect(gridSize(HOME)).toEqual({rows: 2, cols: 4});
  });

  it('readingOrder is row-major', () => {
    expect(readingOrder(HOME)).toEqual(['clock', 'calendar', 'profiles', 'tonight', 'sketch', 'smart']);
  });

  it('rememberFocus records every row a cell covers', () => {
    const cells: GridCell[] = [{id: 'tall', row: 1, col: 0, rowSpan: 2}];
    expect(rememberFocus({}, cells, 'tall')).toEqual({1: 'tall', 2: 'tall'});
    expect(rememberFocus({0: 'x'}, cells, 'missing')).toEqual({0: 'x'});
  });

  it('moveInRow clamps or wraps', () => {
    expect(moveInRow(0, 3, 'left')).toBe(0);
    expect(moveInRow(0, 3, 'left', true)).toBe(2);
    expect(moveInRow(2, 3, 'right')).toBe(2);
    expect(moveInRow(2, 3, 'right', true)).toBe(0);
    expect(moveInRow(1, 3, 'right')).toBe(2);
    expect(moveInRow(0, 0, 'right')).toBe(-1);
  });
});

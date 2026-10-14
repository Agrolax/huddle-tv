/**
 * Pure D-pad navigation over a grid of cells that may span rows and columns.
 *
 * Native Cartesian focus picks "the closest thing in that direction", which
 * jumps unpredictably across uneven widget layouts. This module computes the
 * neighbour for each direction deterministically, so a FocusGrid can wire
 * `nextFocusUp/Down/Left/Right` and never dead-end. No React here: it is unit
 * tested in plain Node.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export interface GridCell {
  id: string;
  /** 0-based top row. */
  row: number;
  /** 0-based left column. */
  col: number;
  rowSpan?: number;
  colSpan?: number;
  /** Disabled cells are skipped by navigation. */
  disabled?: boolean;
}

/** Last focused cell id per row, so Up/Down returns to where you were. */
export type RowMemory = Readonly<Record<number, string>>;

export interface NavigateOptions {
  memory?: RowMemory;
  /** Wrap left/right within the same row band. Default false (edges hand off to native focus). */
  wrapRows?: boolean;
}

export type Neighbors = Partial<Record<Direction, string>>;

interface Box {
  cell: GridCell;
  top: number;
  bottom: number; // inclusive
  left: number;
  right: number; // inclusive
}

function toBox(cell: GridCell): Box {
  const rowSpan = Math.max(1, cell.rowSpan ?? 1);
  const colSpan = Math.max(1, cell.colSpan ?? 1);
  return {
    cell,
    top: cell.row,
    bottom: cell.row + rowSpan - 1,
    left: cell.col,
    right: cell.col + colSpan - 1,
  };
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart) + 1);
}

function gap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  if (aEnd < bStart) return bStart - aEnd;
  if (bEnd < aStart) return aStart - bEnd;
  return 0;
}

/** Throws on duplicate ids or overlapping cells: a broken layout should fail loudly in tests. */
export function validateGrid(cells: readonly GridCell[]): void {
  const seen = new Set<string>();
  const boxes = cells.map(toBox);
  for (const box of boxes) {
    if (seen.has(box.cell.id)) throw new Error(`Duplicate grid cell id "${box.cell.id}"`);
    seen.add(box.cell.id);
    if (box.top < 0 || box.left < 0) throw new Error(`Grid cell "${box.cell.id}" has a negative position`);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (overlap(a.top, a.bottom, b.top, b.bottom) > 0 && overlap(a.left, a.right, b.left, b.right) > 0) {
        throw new Error(`Grid cells "${a.cell.id}" and "${b.cell.id}" overlap`);
      }
    }
  }
}

/** Size of the grid in rows and columns. */
export function gridSize(cells: readonly GridCell[]): {rows: number; cols: number} {
  let rows = 0;
  let cols = 0;
  for (const cell of cells) {
    const box = toBox(cell);
    rows = Math.max(rows, box.bottom + 1);
    cols = Math.max(cols, box.right + 1);
  }
  return {rows, cols};
}

function pickVertical(from: Box, candidates: Box[], dir: 'up' | 'down', memory: RowMemory | undefined): Box | undefined {
  if (candidates.length === 0) return undefined;
  // Nearest band of rows in that direction.
  const distance = (b: Box) => (dir === 'down' ? b.top - from.bottom : from.top - b.bottom);
  const nearest = Math.min(...candidates.map(distance));
  const band = candidates.filter(b => distance(b) === nearest);
  const targetRow = dir === 'down' ? from.bottom + nearest : from.top - nearest;

  // Return to the remembered cell in that row, as long as it sits above/below the source.
  const remembered = memory?.[targetRow];
  if (remembered) {
    const hit = band.find(b => b.cell.id === remembered);
    if (hit && overlap(hit.left, hit.right, from.left, from.right) > 0) return hit;
  }

  return band
    .slice()
    .sort((a, b) => {
      const byOverlap = overlap(b.left, b.right, from.left, from.right) - overlap(a.left, a.right, from.left, from.right);
      if (byOverlap !== 0) return byOverlap;
      const byGap = gap(a.left, a.right, from.left, from.right) - gap(b.left, b.right, from.left, from.right);
      if (byGap !== 0) return byGap;
      return a.left - b.left;
    })[0];
}

function pickHorizontal(from: Box, candidates: Box[], dir: 'left' | 'right'): Box | undefined {
  // Must share at least one row with the source so Right never jumps a row band.
  const sameBand = candidates.filter(b => overlap(b.top, b.bottom, from.top, from.bottom) > 0);
  if (sameBand.length === 0) return undefined;
  const distance = (b: Box) => (dir === 'right' ? b.left - from.right : from.left - b.right);
  return sameBand.slice().sort((a, b) => {
    const byDistance = distance(a) - distance(b);
    if (byDistance !== 0) return byDistance;
    // Prefer the cell aligned with the source's top row, then the higher one.
    const aAligned = a.top <= from.top && from.top <= a.bottom ? 0 : 1;
    const bAligned = b.top <= from.top && from.top <= b.bottom ? 0 : 1;
    if (aAligned !== bAligned) return aAligned - bAligned;
    return a.top - b.top;
  })[0];
}

/**
 * The cell that should receive focus when `dir` is pressed on `fromId`,
 * or `undefined` at an edge (let the platform hand focus to whatever is outside the grid).
 */
export function getNeighbor(
  cells: readonly GridCell[],
  fromId: string,
  dir: Direction,
  options: NavigateOptions = {},
): string | undefined {
  const boxes = cells.filter(c => !c.disabled || c.id === fromId).map(toBox);
  const from = boxes.find(b => b.cell.id === fromId);
  if (!from) return undefined;
  const others = boxes.filter(b => b !== from && !b.cell.disabled);

  let hit: Box | undefined;
  switch (dir) {
    case 'down':
      hit = pickVertical(from, others.filter(b => b.top > from.bottom), 'down', options.memory);
      break;
    case 'up':
      hit = pickVertical(from, others.filter(b => b.bottom < from.top), 'up', options.memory);
      break;
    case 'right':
      hit = pickHorizontal(from, others.filter(b => b.left > from.right), 'right');
      if (!hit && options.wrapRows) hit = pickHorizontal({...from, right: -1}, others.filter(b => b.right < from.left), 'right');
      break;
    case 'left':
      hit = pickHorizontal(from, others.filter(b => b.right < from.left), 'left');
      if (!hit && options.wrapRows) {
        const {cols} = gridSize(cells);
        hit = pickHorizontal({...from, left: cols}, others.filter(b => b.left > from.right), 'left');
      }
      break;
  }
  return hit?.cell.id;
}

/** Neighbours for every cell, ready to turn into `nextFocus*` props. */
export function buildNeighborMap(
  cells: readonly GridCell[],
  options: NavigateOptions = {},
): Record<string, Neighbors> {
  const map: Record<string, Neighbors> = {};
  for (const cell of cells) {
    const neighbors: Neighbors = {};
    for (const dir of DIRECTIONS) {
      const id = getNeighbor(cells, cell.id, dir, options);
      if (id) neighbors[dir] = id;
    }
    map[cell.id] = neighbors;
  }
  return map;
}

/** Record that `id` was focused, for every row the cell covers. Returns a new object. */
export function rememberFocus(memory: RowMemory, cells: readonly GridCell[], id: string): RowMemory {
  const cell = cells.find(c => c.id === id);
  if (!cell) return memory;
  const box = toBox(cell);
  const next: Record<number, string> = {...memory};
  for (let row = box.top; row <= box.bottom; row++) next[row] = id;
  return next;
}

/**
 * Cells laid out left-to-right, top-to-bottom: what a screen reader or a
 * "first focus" fallback should use.
 */
export function readingOrder(cells: readonly GridCell[]): string[] {
  return cells
    .slice()
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map(c => c.id);
}

/** 1-D helper for a simple row of items. Returns the new index, or `index` at an edge. */
export function moveInRow(index: number, length: number, dir: 'left' | 'right', wrap = false): number {
  if (length <= 0) return -1;
  const delta = dir === 'right' ? 1 : -1;
  const next = index + delta;
  if (next < 0) return wrap ? length - 1 : index;
  if (next >= length) return wrap ? 0 : index;
  return next;
}

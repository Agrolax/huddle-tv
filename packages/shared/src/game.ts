/**
 * Game night helpers that the server, TV and phone share, so scores and
 * standings read the same on every screen.
 */
import type {GameState, League, LeagueEntry} from './protocol';

export const QUIZ_MAX_POINTS = 1000;

/** "A".."D". */
export function choiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Kahoot-style: a right answer is worth 500, plus up to 500 more for speed.
 * `msLeft` is the time left on the clock when the answer arrived.
 */
export function quizPoints(correct: boolean, msLeft: number, msTotal: number): number {
  if (!correct) return 0;
  const share = msTotal > 0 ? Math.min(1, Math.max(0, msLeft / msTotal)) : 1;
  return Math.round(QUIZ_MAX_POINTS / 2 + (QUIZ_MAX_POINTS / 2) * share);
}

export interface Standing {
  profileId: string;
  points: number;
  /** 1-based; ties share a place. */
  place: number;
}

/** Highest first; ties share a place and keep profile order from `order`. */
export function standings(points: Record<string, number>, order: readonly string[] = []): Standing[] {
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  const rows = Object.entries(points)
    .map(([profileId, p]) => ({profileId, points: p}))
    .sort((a, b) => b.points - a.points || rank(a.profileId) - rank(b.profileId));
  let place = 0;
  let last = Number.NaN;
  return rows.map((r, i) => {
    if (r.points !== last) {
      place = i + 1;
      last = r.points;
    }
    return {...r, place};
  });
}

/** Add one finished game to the league. Everyone who scored or answered played; the top score (> 0) wins. */
export function addToLeague(league: League, game: Pick<GameState, 'scores'>): League {
  const players = Object.keys(game.scores);
  if (!players.length) return league;
  const best = Math.max(...players.map(id => game.scores[id] ?? 0));
  const next: League = {...league};
  for (const id of players) {
    const prev: LeagueEntry = next[id] ?? {points: 0, wins: 0, games: 0};
    next[id] = {
      points: prev.points + (game.scores[id] ?? 0),
      wins: prev.wins + (best > 0 && game.scores[id] === best ? 1 : 0),
      games: prev.games + 1,
    };
  }
  return next;
}

export function leaguePoints(league: League): Record<string, number> {
  return Object.fromEntries(Object.entries(league).map(([id, e]) => [id, e.points]));
}

/** The game is running: someone could answer or is waiting for the next question. */
export function gameIsLive(game: GameState): boolean {
  return game.phase === 'loading' || game.phase === 'question' || game.phase === 'reveal';
}

// --- Sketch the pick -------------------------------------------------------

/** The drawer wins this much for every person who guesses their drawing. */
export const SKETCH_DRAWER_POINTS = 250;

/** "Paddington 2" → "__________ 2": letters hidden, digits, spaces and punctuation kept. */
export function titleHint(title: string): string {
  return [...title].map(c => (/\p{L}/u.test(c) ? '_' : c)).join('');
}

const NUMBER_WORDS: Record<string, string> = {one: '1', two: '2', three: '3', four: '4', five: '5'};

/** Lowercase words without accents, punctuation, a leading "the" or "and"/"&" noise. */
export function normalizeTitle(s: string): string {
  const words = s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => NUMBER_WORDS[w] ?? w);
  if (words[0] === 'the' && words.length > 1) words.shift();
  return words.filter(w => w !== 'and').join(' ');
}

/** Edit distance, capped: stops counting past `max`. */
function closeEnough(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length]! <= max;
}

/** Whole words of `title` in a row that make up `guess`: "totoro" in "my neighbor totoro". */
function isWordRun(guess: string, title: string): boolean {
  return ` ${title} `.includes(` ${guess} `);
}

/**
 * Is this guess the title? Forgiving on case, punctuation, "The", "&" and
 * number words, one typo per 8 letters, the part before a colon ("Wallace
 * and Gromit"), and the name people actually say: whole words from the title
 * with at least 6 letters or half the title ("Totoro", "Paddington").
 */
export function guessMatches(guess: string, title: string): boolean {
  const g = normalizeTitle(guess);
  if (!g) return false;
  const full = normalizeTitle(title);
  const targets = [full];
  const main = title.split(':')[0]!;
  if (main !== title && normalizeTitle(main).length >= 4) targets.push(normalizeTitle(main));
  if (targets.some(t => g === t || closeEnough(g, t, Math.floor(t.replace(/ /g, '').length / 8)))) return true;
  const letters = (s: string) => s.replace(/ /g, '').length;
  return isWordRun(g, full) && (letters(g) >= 6 || letters(g) * 2 >= letters(full));
}

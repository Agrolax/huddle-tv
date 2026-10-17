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

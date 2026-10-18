import {CalendarEvent, EndsBy, Profile, TonightPick, clockTime} from '@huddle/shared';
import {joinNames} from '../ai/types.js';

/** A kid's bedtime on a school night; an hour later when tomorrow is Saturday or Sunday. */
const KID_BEDTIME = {hour: 20, minute: 30};
/** An event tomorrow before this hour means an early start. */
const EARLY_HOUR = 9;
/** Grown-ups want this much time between the end of the movie and an early start. */
const EARLY_GAP_MS = 10.5 * 3_600_000;
/** Only plan around a finish time this close; in the morning it means nothing yet. */
const WINDOW_MS = 6 * 3_600_000;

export interface Limit {
  at: Date;
  reason: string;
}

/**
 * When tonight has to end for the people here, or null. The earlier of a
 * child's bedtime and an early event tomorrow wins. Server local time.
 */
export function tonightLimit(profiles: readonly Profile[], presentIds: readonly string[], events: readonly CalendarEvent[], now: Date): Limit | null {
  const present = profiles.filter(p => presentIds.includes(p.id));
  const limits: Limit[] = [];

  const kids = present.filter(p => p.kid);
  if (kids.length) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekend = tomorrow.getDay() === 0 || tomorrow.getDay() === 6;
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), KID_BEDTIME.hour + (weekend ? 1 : 0), KID_BEDTIME.minute);
    limits.push({at, reason: kids.length === 1 ? `${kids[0]!.name}'s bedtime` : `Bedtime for ${joinNames(kids)}`});
  }

  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const early = events
    .filter(e => !e.profileIds.length || e.profileIds.some(id => presentIds.includes(id)))
    .map(e => ({e, start: new Date(e.start)}))
    .filter(({start}) => start.getTime() >= dayStart && start.getTime() < dayStart + EARLY_HOUR * 3_600_000)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (early) limits.push({at: new Date(early.start.getTime() - EARLY_GAP_MS), reason: `${early.e.title} at ${clockTime(early.start)} tomorrow`});

  const first = limits.sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  if (!first) return null;
  const left = first.at.getTime() - now.getTime();
  return left > 0 && left <= WINDOW_MS ? first : null;
}

export function endsByOf(limit: Limit): EndsBy {
  return {at: limit.at.toISOString(), label: clockTime(limit.at), reason: limit.reason};
}

/**
 * Picks that finish in time, topped up from `extra` when the model's picks run
 * long. If too little fits, the shortest of the rest fill in so there are
 * still `count` picks.
 */
export function fitPicks(picks: readonly TonightPick[], extra: readonly TonightPick[], maxMinutes: number, count = 3): TonightPick[] {
  const fits = (p: TonightPick) => p.minutes === undefined || p.minutes <= maxMinutes;
  const out: TonightPick[] = [];
  const add = (p: TonightPick) => {
    if (out.length < count && !out.some(o => o.title.toLowerCase() === p.title.toLowerCase())) out.push(p);
  };
  picks.filter(fits).forEach(add);
  extra.filter(fits).forEach(add);
  [...picks, ...extra].sort((a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity)).forEach(add);
  return out;
}

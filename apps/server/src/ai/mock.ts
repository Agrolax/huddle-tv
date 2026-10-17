import {TONIGHT_MOODS, TonightMood, TonightPick, deviceStateLabel, eventWhen, upcomingEvents, weatherSummary} from '@huddle/shared';
import {MOVIE_TRIVIA, mockWatchedIt} from '../quiz/watchedIt.js';
import {ChatContext, HouseholdAI, Person, QuizContext, QuizResult, TonightContext, joinNames} from './types.js';

interface CatalogEntry {
  title: string;
  year: number;
  service: string;
  moods: TonightMood[];
  /** Finishes the sentence "… <blurb>" in the why line. */
  blurb: string;
}

/** A small hand-picked catalog. Services are illustrative; availability varies by region. */
const CATALOG: readonly CatalogEntry[] = [
  {title: 'Paddington 2', year: 2017, service: 'Prime Video', moods: ['cozy', 'funny'], blurb: 'warm, silly and kind'},
  {title: 'My Neighbor Totoro', year: 1988, service: 'Max', moods: ['cozy'], blurb: 'gentle and dreamy'},
  {title: 'The Great British Baking Show', year: 2010, service: 'Netflix', moods: ['cozy'], blurb: 'low stakes and lots of cake'},
  {title: 'Up', year: 2009, service: 'Disney+', moods: ['cozy'], blurb: 'a big adventure with a soft heart'},
  {title: 'Ted Lasso', year: 2020, service: 'Apple TV+', moods: ['cozy', 'funny'], blurb: 'feel-good and quick to love'},
  {title: 'The Mitchells vs. the Machines', year: 2021, service: 'Netflix', moods: ['funny'], blurb: 'a chaotic family road trip'},
  {title: 'School of Rock', year: 2003, service: 'Paramount+', moods: ['funny'], blurb: 'loud, funny and easy to share'},
  {title: 'Wallace & Gromit: Vengeance Most Fowl', year: 2024, service: 'Netflix', moods: ['funny', 'cozy'], blurb: 'clever jokes for every age'},
  {title: 'Game Night', year: 2018, service: 'Max', moods: ['funny', 'edge-of-seat'], blurb: 'laughs with a real mystery'},
  {title: 'Knives Out', year: 2019, service: 'Prime Video', moods: ['edge-of-seat', 'funny'], blurb: 'a whodunit you can solve together'},
  {title: 'Reacher', year: 2022, service: 'Prime Video', moods: ['edge-of-seat'], blurb: 'fast, punchy episodes'},
  {title: 'Top Gun: Maverick', year: 2022, service: 'Paramount+', moods: ['edge-of-seat'], blurb: 'big-screen thrills'},
  {title: 'Apollo 13', year: 1995, service: 'Peacock', moods: ['edge-of-seat'], blurb: 'true-story tension'},
  {title: 'Jack Ryan', year: 2018, service: 'Prime Video', moods: ['edge-of-seat'], blurb: 'a binge-worthy spy chase'},
];

/** FNV-1a, so the same people + mood always get the same picks. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function rotate<T>(list: readonly T[], by: number): T[] {
  const n = by % list.length;
  return [...list.slice(n), ...list.slice(0, n)];
}

export function mockTonight(people: readonly Person[], mood?: TonightMood): TonightPick[] {
  const seed = hash(`${people.map(p => p.id).sort().join(',')}|${mood ?? ''}`);
  const chosen: CatalogEntry[] = [];
  if (mood) {
    chosen.push(...rotate(CATALOG.filter(e => e.moods.includes(mood)), seed).slice(0, 3));
  } else {
    // No mood: one of each, so the sheet shows the range.
    for (const m of TONIGHT_MOODS) {
      const options = CATALOG.filter(e => e.moods[0] === m.id && !chosen.includes(e));
      chosen.push(rotate(options, seed)[0]!);
    }
  }
  const names = joinNames(people);
  return chosen.map(e => ({
    title: e.title,
    year: e.year,
    service: e.service,
    why: `${capitalize(e.blurb)}, a good fit for ${names}.`,
  }));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A rule-based answer from the household context. Mentions mock mode so nobody mistakes it for the model. */
export function mockAnswer(ctx: ChatContext): string {
  const q = (ctx.turns[ctx.turns.length - 1]?.text ?? '').toLowerCase();
  const names = joinNames(ctx.people);
  const has = (...words: string[]) => words.some(w => new RegExp(`\\b${w}`).test(q));

  if (has('watch', 'tonight', 'movie', 'film', 'show', 'bored')) {
    const [a, b] = mockTonight(ctx.people);
    return `For ${names}, try ${a!.title} (${a!.service}) or ${b!.title} (${b!.service}). Open Tonight on the TV for three picks by mood.`;
  }
  if (has('weather', 'cold', 'warm', 'rain', 'snow', 'jacket', 'umbrella', 'outside')) {
    const w = ctx.weather;
    if (!w) return "I don't have the weather yet. The TV will show it as soon as the server fetches it.";
    const range = w.highC !== undefined && w.lowC !== undefined ? `, with a high of ${w.highC}° and a low of ${w.lowC}°` : '';
    const advice = w.tempC < 10 ? ' Bring a jacket.' : '';
    return `It's ${w.tempC}° and ${weatherSummary(w.code).toLowerCase()} in ${w.place}${range}.${advice}`;
  }
  if (has('calendar', 'today', 'tomorrow', 'schedule', 'plan', 'when', 'busy', 'week', 'dentist', 'soccer')) {
    const next = upcomingEvents(ctx.events, ctx.now, 3);
    if (!next.length) return 'The family calendar is empty. Add something from the calendar card.';
    const list = next.map(e => `${e.title} (${describeWhen(e.start, ctx.now)})`).join(', ');
    return `Coming up: ${list}.`;
  }
  if (has('lamp', 'light', 'door', 'lock', 'thermostat', 'temperature', 'heat')) {
    if (!ctx.devices.length) return 'No devices are connected.';
    const list = ctx.devices.map(d => `${d.name}: ${deviceStateLabel(d)}`).join(', ');
    return `${list}. You can change them from the Home card.`;
  }
  if (has('hi', 'hello', 'hey', 'salam')) {
    const who = ctx.askedBy ? `, ${ctx.askedBy.name}` : '';
    return `Hi${who}! Ask me what to watch, what's on the calendar, or about the weather.`;
  }
  return "I'm running in demo mode without Bedrock, so I only know this household: what to watch, the family calendar, the weather and the home devices. Try “What should we watch?”";
}

/** "at 7:00", "tomorrow", "on Sat", "on Oct 30". */
function describeWhen(startIso: string, now: Date): string {
  const when = eventWhen(startIso, now);
  if (/\d:\d\d/.test(when)) return `today at ${when}`;
  if (when === 'Tomorrow') return 'tomorrow';
  return `on ${when}`;
}

export interface MockAIOptions {
  /** Pause between streamed words. Tests pass 0. */
  delayMs?: number;
}

export class MockAI implements HouseholdAI {
  readonly source = 'mock' as const;
  private readonly delayMs: number;

  constructor(opts: MockAIOptions = {}) {
    this.delayMs = opts.delayMs ?? 35;
  }

  async tonight(ctx: TonightContext): Promise<TonightPick[]> {
    await sleep(this.delayMs * 10);
    return mockTonight(ctx.people, ctx.mood);
  }

  async quiz(ctx: QuizContext): Promise<QuizResult> {
    await sleep(this.delayMs * 10);
    const known = mockWatchedIt(ctx.title);
    return known ? {title: ctx.title, items: known} : {title: 'Movie trivia', items: MOVIE_TRIVIA};
  }

  async *chat(ctx: ChatContext, signal?: AbortSignal): AsyncIterable<string> {
    const words = mockAnswer(ctx).split(/(?<= )/);
    for (const w of words) {
      if (signal?.aborted) return;
      await sleep(this.delayMs);
      yield w;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

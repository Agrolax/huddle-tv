import type {QuizItem} from '../quiz/questions.js';
import type {CalendarEvent, SmartDevice, TonightMood, TonightPick, Weather} from '@huddle/shared';

export interface Person {
  id: string;
  name: string;
  /** A child: picks and answers stay kid-friendly. */
  kid?: boolean;
}

export interface TonightContext {
  /** Who's in the room, in profile order. */
  people: Person[];
  mood?: TonightMood;
  now: Date;
  /** Tonight must finish by then (a child's bedtime, an early start). */
  endsBy?: {at: Date; reason: string};
}

/** Whole minutes from `now` to `at`, never below 0. */
export function minutesUntil(at: Date, now: Date): number {
  return Math.max(0, Math.floor((at.getTime() - now.getTime()) / 60_000));
}

/** Watched It: questions about one movie or series. */
export interface QuizContext {
  title: string;
  people: Person[];
  now: Date;
}

/** The questions and the title to show. The mock renames unknown titles to "Movie trivia". */
export interface QuizResult {
  title: string;
  items: QuizItem[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatContext {
  householdName: string;
  /** Who's in the room. */
  people: Person[];
  /** The profile on the phone that asked, if it picked one. */
  askedBy?: Person;
  /** Everyone in the household, to name who an event is for. Defaults to `people`. */
  everyone?: Person[];
  events: CalendarEvent[];
  devices: SmartDevice[];
  weather: Weather | null;
  now: Date;
  /** Earlier turns of this conversation, oldest first, ending with the new user question. */
  turns: ChatTurn[];
}

/**
 * The household's AI: Bedrock (Nova) in production, a deterministic mock
 * without AWS. The hub only talks to this interface.
 */
export interface HouseholdAI {
  readonly source: 'bedrock' | 'mock';
  /** Exactly three picks. Throws if the model returns fewer usable ones. */
  tonight(ctx: TonightContext, signal?: AbortSignal): Promise<TonightPick[]>;
  /** The answer as text chunks, in order. */
  chat(ctx: ChatContext, signal?: AbortSignal): AsyncIterable<string>;
  /** Five multiple-choice questions about `ctx.title`. Throws if the model returns fewer than three usable ones. */
  quiz(ctx: QuizContext, signal?: AbortSignal): Promise<QuizResult>;
}

/** "Rafi", "Rafi and Nanu", "Rafi, Nanu and Ammu". */
export function joinNames(people: readonly Person[]): string {
  const names = people.map(p => p.name);
  if (names.length === 0) return 'everyone';
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const TITLE_MAX = 80;
const WHY_MAX = 160;
const SERVICE_MAX = 30;

function clip(s: string, max: number): string {
  const chars = [...s.trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

/** Keep only well-formed picks, trimmed to what the TV can show. Model output is untrusted. */
export function sanitizePicks(raw: unknown): TonightPick[] {
  if (!Array.isArray(raw)) return [];
  const picks: TonightPick[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const {title, year, why, service, minutes} = item as Record<string, unknown>;
    if (typeof title !== 'string' || !title.trim() || typeof why !== 'string' || !why.trim()) continue;
    const y = typeof year === 'string' ? Number(year) : year;
    const m = typeof minutes === 'string' ? Number(minutes) : minutes;
    picks.push({
      title: clip(title, TITLE_MAX),
      ...(typeof y === 'number' && Number.isInteger(y) && y >= 1900 && y <= 2100 ? {year: y} : {}),
      why: clip(why, WHY_MAX),
      ...(typeof service === 'string' && service.trim() ? {service: clip(service, SERVICE_MAX)} : {}),
      ...(typeof m === 'number' && Number.isInteger(m) && m > 0 && m <= 600 ? {minutes: m} : {}),
    });
  }
  return picks;
}

/** Pull `{"picks": [...]}` (or a bare array) out of a model reply that may wrap it in prose or a code fence. */
export function parsePicksJson(text: string): TonightPick[] {
  const start = text.search(/[[{]/);
  if (start < 0) return [];
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : (data as {picks?: unknown})?.picks;
  return sanitizePicks(list);
}

import {HouseholdSnapshot, QUIZ_ROUNDS, upcomingEvents} from '@huddle/shared';
import {QuizItem} from './questions.js';

/**
 * Our Week: questions built from the household's own data (calendar,
 * messages, weather, devices, people). No AI, so the answers are always right.
 */
export function ourWeekQuestions(snapshot: HouseholdSnapshot, now: Date, random: () => number): QuizItem[] {
  const members = snapshot.profiles.filter(p => p.id !== 'guest');
  const name = (id: string) => snapshot.profiles.find(p => p.id === id)?.name;
  const week = upcomingEvents(snapshot.events, now).filter(e => Date.parse(e.start) - now.getTime() < 7 * DAY);

  // About people: the best questions, but at most three so the quiz has a mix.
  const personal: QuizItem[] = [];
  for (const e of week) {
    const who = e.profileIds.length === 1 ? name(e.profileIds[0]!) : undefined;
    if (who) {
      const item = pickOne(`Who has ${e.title} ${whenPhrase(e.start, now)}?`, who, members.map(m => m.name), random);
      if (item) personal.push(item);
    }
    personal.push(pickOne(`When is ${e.title}?`, dayLabel(e.start, now), dayPool(now), random)!);
  }
  for (const m of snapshot.messages.slice(0, 5)) {
    const who = m.fromProfileId ? name(m.fromProfileId) : undefined;
    if (!who) continue;
    const item = pickOne(`Who sent “${clip(m.text, 50)}”?`, who, members.map(p => p.name), random);
    if (item) personal.push(item);
  }

  // Facts about the house right now.
  const facts: QuizItem[] = [];
  const w = snapshot.weather;
  if (w?.highC !== undefined) facts.push(numberQuestion(`What is the high today in ${w.place}?`, w.highC, 2, n => `${n}°`, random));
  const thermostat = snapshot.devices.find(d => d.kind === 'thermostat' && d.level !== undefined);
  if (thermostat) facts.push(numberQuestion('What is the thermostat set to?', thermostat.level!, 1, n => `${n}°`, random));
  facts.push(numberQuestion('How many events are on the family calendar this week?', week.length, 1, String, random, 0));
  facts.push(numberQuestion('How many people are here right now?', snapshot.activeProfileIds.length, 1, String, random, 1));

  // Always available, so there are enough questions even in an empty week.
  const spare: QuizItem[] = [
    pickOne('What is this household called in Huddle?', snapshot.name, FAKE_HOUSEHOLDS, random)!,
    numberQuestion('How many people live in this household?', members.length, 1, String, random, 1),
  ];
  const member = members[Math.floor(random() * members.length)];
  if (member) spare.push(pickOne('Who lives in this household?', member.name, FAKE_PEOPLE.filter(n => !members.some(m => m.name === n)), random)!);

  const ordered = [...shuffle(personal, random).slice(0, 3), ...shuffle(facts, random), ...spare, ...shuffle(personal, random).slice(3)];
  return ordered.slice(0, QUIZ_ROUNDS);
}

const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FAKE_HOUSEHOLDS = ['The Smiths', 'The Parks', 'The Garcias', 'The Nguyens', 'The Okafors'];
const FAKE_PEOPLE = ['Zara', 'Omar', 'Lina', 'Sami', 'Maya', 'Theo'];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today", "Tomorrow" or the weekday. */
function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return days >= 7 ? `Next ${WEEKDAYS[d.getDay()]!}` : WEEKDAYS[d.getDay()]!;
}

function whenPhrase(iso: string, now: Date): string {
  const label = dayLabel(iso, now);
  if (label === 'Today' || label === 'Tomorrow') return label.toLowerCase();
  return label.startsWith('Next') ? label.replace('Next', 'next') : `on ${label}`;
}

/** Today, Tomorrow, the next five weekdays and "Next <today's weekday>". */
function dayPool(now: Date): string[] {
  const pool = ['Today', 'Tomorrow'];
  for (let i = 2; i < 7; i++) pool.push(WEEKDAYS[(now.getDay() + i) % 7]!);
  pool.push(`Next ${WEEKDAYS[now.getDay()]!}`);
  return pool;
}

/** Right answer plus three different wrong ones from `pool`. Null when the pool is too small. */
function pickOne(text: string, right: string, pool: readonly string[], random: () => number): QuizItem | null {
  const wrong = shuffle(
    pool.filter(p => p !== right),
    random,
  ).slice(0, 3);
  // Small households: fill with answers that are never right.
  for (const filler of ['Everyone', 'Nobody', 'Guest']) {
    if (wrong.length >= 3) break;
    if (filler !== right && !wrong.includes(filler)) wrong.push(filler);
  }
  if (wrong.length < 3) return null;
  return {text, choices: [right, ...wrong], answer: 0};
}

function numberQuestion(text: string, right: number, step: number, show: (n: number) => string, random: () => number, min = -Infinity): QuizItem {
  const near = [right - 2 * step, right - step, right + step, right + 2 * step, right + 3 * step].filter(n => n >= min);
  return {text, choices: [show(right), ...shuffle(near, random).slice(0, 3).map(show)], answer: 0};
}

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function clip(s: string, max: number): string {
  const chars = [...s.trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

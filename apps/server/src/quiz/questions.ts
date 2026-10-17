import {QUIZ_CHOICES} from '@huddle/shared';

/** A question with its answer. Only the server sees `answer`. */
export interface QuizItem {
  text: string;
  /** Exactly QUIZ_CHOICES options. */
  choices: string[];
  /** Index into `choices`. */
  answer: number;
}

const TEXT_MAX = 140;
const CHOICE_MAX = 40;

function clip(s: string, max: number): string {
  const chars = [...s.trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

/** Keep only well-formed questions. Model output is untrusted. */
export function sanitizeQuiz(raw: unknown): QuizItem[] {
  if (!Array.isArray(raw)) return [];
  const items: QuizItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const {question, text, choices, answer} = entry as Record<string, unknown>;
    const q = typeof question === 'string' ? question : text;
    if (typeof q !== 'string' || !q.trim()) continue;
    if (!Array.isArray(choices) || choices.length !== QUIZ_CHOICES) continue;
    if (!choices.every(c => typeof c === 'string' && c.trim())) continue;
    const clean = (choices as string[]).map(c => clip(c, CHOICE_MAX));
    if (new Set(clean.map(c => c.toLowerCase())).size !== QUIZ_CHOICES) continue;
    const a = typeof answer === 'string' ? Number(answer) : answer;
    if (typeof a !== 'number' || !Number.isInteger(a) || a < 0 || a >= QUIZ_CHOICES) continue;
    items.push({text: clip(q, TEXT_MAX), choices: clean, answer: a});
  }
  return items;
}

/** `{"questions":[...]}` or a bare array, with or without prose around it. */
export function parseQuizJson(text: string): QuizItem[] {
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
  return sanitizeQuiz(Array.isArray(data) ? data : (data as {questions?: unknown})?.questions);
}

/** Move the right answer to a random slot, so it isn't always A. */
export function shuffleChoices(item: QuizItem, random: () => number): QuizItem {
  const order = item.choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return {text: item.text, choices: order.map(i => item.choices[i]!), answer: order.indexOf(item.answer)};
}

/** A question whose first choice is right. */
export function q(text: string, right: string, ...wrong: [string, string, string]): QuizItem {
  return {text, choices: [right, ...wrong], answer: 0};
}

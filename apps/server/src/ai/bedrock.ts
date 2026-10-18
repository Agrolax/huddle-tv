import {BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand, Message} from '@aws-sdk/client-bedrock-runtime';
import {TONIGHT_MOODS, TonightPick, clockTime, deviceStateLabel, eventWhen, upcomingEvents, weatherSummary} from '@huddle/shared';
import {QuizItem, parseQuizJson} from '../quiz/questions.js';
import {ChatContext, HouseholdAI, QuizContext, QuizResult, TonightContext, joinNames, minutesUntil, parsePicksJson} from './types.js';

export interface BedrockAIOptions {
  region: string;
  /** Inference profile ids. Nova needs the `us.` (or `eu.`/`apac.`) cross-region profile, not the bare model id. */
  tonightModel?: string;
  chatModel?: string;
  quizModel?: string;
  /** Tests inject a fake with the same `send`. */
  client?: Pick<BedrockRuntimeClient, 'send'>;
}

export const DEFAULT_TONIGHT_MODEL = 'us.amazon.nova-lite-v1:0';
export const DEFAULT_CHAT_MODEL = 'us.amazon.nova-micro-v1:0';
/** Lite made up more movie facts in our tests (Oct 18); Pro writes the quiz and a second pass checks it. */
export const DEFAULT_QUIZ_MODEL = 'us.amazon.nova-pro-v1:0';
/** Ask for more than we need, since the check pass drops the doubtful ones. */
const QUIZ_ASKED = 8;

/** Amazon Nova through the Bedrock Converse API. Credentials come from the default AWS chain. */
export class BedrockAI implements HouseholdAI {
  readonly source = 'bedrock' as const;
  private readonly client: Pick<BedrockRuntimeClient, 'send'>;
  private readonly tonightModel: string;
  private readonly chatModel: string;
  private readonly quizModel: string;

  constructor(opts: BedrockAIOptions) {
    this.client = opts.client ?? new BedrockRuntimeClient({region: opts.region});
    this.tonightModel = opts.tonightModel ?? DEFAULT_TONIGHT_MODEL;
    this.chatModel = opts.chatModel ?? DEFAULT_CHAT_MODEL;
    this.quizModel = opts.quizModel ?? DEFAULT_QUIZ_MODEL;
  }

  async tonight(ctx: TonightContext, signal?: AbortSignal): Promise<TonightPick[]> {
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.tonightModel,
        system: [{text: TONIGHT_SYSTEM}],
        messages: [{role: 'user', content: [{text: tonightPrompt(ctx)}]}],
        inferenceConfig: {maxTokens: 700, temperature: 0.8},
      }),
      {abortSignal: signal},
    );
    const text = (res.output?.message?.content ?? []).map(c => c.text ?? '').join('');
    const picks = parsePicksJson(text);
    if (picks.length < 3) throw new Error(`Bedrock returned ${picks.length} usable picks`);
    return picks.slice(0, 3);
  }

  async quiz(ctx: QuizContext, signal?: AbortSignal): Promise<QuizResult> {
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.quizModel,
        system: [{text: QUIZ_SYSTEM}],
        messages: [{role: 'user', content: [{text: quizPrompt(ctx)}]}],
        inferenceConfig: {maxTokens: 1400, temperature: 0.5},
      }),
      {abortSignal: signal},
    );
    const text = (res.output?.message?.content ?? []).map(c => c.text ?? '').join('');
    const items = await this.checkQuiz(ctx.title, parseQuizJson(text), signal);
    if (items.length < 3) throw new Error(`Bedrock returned ${items.length} checked questions`);
    return {title: ctx.title, items: items.slice(0, 5)};
  }

  /**
   * Models make up movie trivia. Ask again, cold and without the answers, and
   * keep only the questions where both passes agree.
   */
  private async checkQuiz(title: string, items: QuizItem[], signal?: AbortSignal): Promise<QuizItem[]> {
    if (!items.length) return [];
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.quizModel,
        system: [{text: QUIZ_CHECK_SYSTEM}],
        messages: [{role: 'user', content: [{text: quizCheckPrompt(title, items)}]}],
        inferenceConfig: {maxTokens: 300, temperature: 0},
      }),
      {abortSignal: signal},
    );
    const answers = parseCheckAnswers((res.output?.message?.content ?? []).map(c => c.text ?? '').join(''));
    return items.filter((item, i) => answers[i] === item.answer);
  }

  async *chat(ctx: ChatContext, signal?: AbortSignal): AsyncIterable<string> {
    const res = await this.client.send(
      new ConverseStreamCommand({
        modelId: this.chatModel,
        system: [{text: chatSystem(ctx)}],
        messages: toMessages(ctx.turns),
        inferenceConfig: {maxTokens: 400, temperature: 0.6},
      }),
      {abortSignal: signal},
    );
    for await (const event of res.stream ?? []) {
      const text = event.contentBlockDelta?.delta?.text;
      if (text) yield text;
    }
  }
}

const TONIGHT_SYSTEM = [
  'You pick what a family watches tonight on Fire TV.',
  'Reply with JSON only, no prose and no code fence, in exactly this shape:',
  '{"picks":[{"title":"...","year":2017,"minutes":104,"service":"Prime Video","why":"..."}]}',
  '"minutes" is the running time (one episode for a series).',
  'Give exactly 3 picks: real, well-known movies or series that suit everyone in the room.',
  '"why" is one short sentence (under 120 characters) that names the people it suits.',
  '"service" is where it usually streams in the US; prefer Prime Video when it fits.',
].join('\n');

const QUIZ_SYSTEM = [
  'You write a family quiz about a movie or series the family just watched together on TV.',
  'Reply with JSON only, no prose and no code fence, in exactly this shape:',
  '{"questions":[{"question":"...","choices":["...","...","...","..."],"answer":0}]}',
  `Write exactly ${QUIZ_ASKED} questions. Each has exactly 4 short choices (under 40 characters) and "answer" is the index of the right one.`,
  'Ask about characters, places, objects and funny moments that anyone who watched would remember. No questions about the ending.',
  'Only ask about things you are completely sure of: the main characters, famous scenes, well-known facts. Skip anything you might be misremembering.',
  'Facts must be correct. Questions under 120 characters, simple words, suitable for kids.',
].join('\n');

const QUIZ_CHECK_SYSTEM = [
  'You check a family quiz about a movie or series. Answer each question from what you know about the title.',
  'Reply with JSON only: {"answers":[0,2,-1,...]}, one entry per question in order: the index (0-3) of the right choice, or -1 if you are not sure or none is right.',
].join('\n');

export function quizCheckPrompt(title: string, items: QuizItem[]): string {
  return [`Title: ${title}.`, ...items.map((q, i) => `${i + 1}. ${q.text} ${q.choices.map((c, k) => `(${k}) ${c}`).join(' ')}`)].join('\n');
}

/** `{"answers":[...]}` from the check pass; anything unreadable counts as "not sure". */
export function parseCheckAnswers(text: string): number[] {
  const m = text.match(/\[[^\]]*\]/);
  if (!m) return [];
  try {
    const list = JSON.parse(m[0]);
    return Array.isArray(list) ? list.map(n => (Number.isInteger(n) ? n : -1)) : [];
  } catch {
    return [];
  }
}

export function quizPrompt(ctx: QuizContext): string {
  const kids = ctx.people.filter(p => p.kid);
  return [`Title: ${ctx.title}.`, `Players: ${joinNames(ctx.people)}.`, kids.length ? `${joinNames(kids)} ${kids.length > 1 ? 'are children' : 'is a child'}: keep it simple.` : '']
    .filter(Boolean)
    .join('\n');
}

/** "today", "tomorrow", "on Saturday", "on Oct 30". */
function dayWord(startIso: string, now: Date): string {
  const when = eventWhen(startIso, now);
  if (/\d:\d\d/.test(when)) return 'today';
  if (when === 'Tomorrow') return 'tomorrow';
  const long: Record<string, string> = {Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'};
  return `on ${long[when] ?? when}`;
}

/** Children in the room keep picks rated for them. */
function kidsLine(people: TonightContext['people']): string {
  const kids = people.filter(p => p.kid);
  if (!kids.length) return '';
  return `${joinNames(kids)} ${kids.length > 1 ? 'are children' : 'is a child'}: only picks rated G, PG, TV-Y7, TV-G or TV-PG.`;
}

export function tonightPrompt(ctx: TonightContext): string {
  const mood = TONIGHT_MOODS.find(m => m.id === ctx.mood)?.label;
  return [
    `In the room: ${joinNames(ctx.people)}.`,
    mood ? `Mood: ${mood}.` : 'Mood: any; give a mix (one cozy, one funny, one edge-of-seat).',
    `It is ${ctx.now.toDateString()}.`,
    kidsLine(ctx.people),
    ctx.endsBy
      ? `It has to end by ${clockTime(ctx.endsBy.at)} (${ctx.endsBy.reason}): every pick must run at most ${minutesUntil(ctx.endsBy.at, ctx.now)} minutes ("minutes" is checked). A series episode is fine.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function chatSystem(ctx: ChatContext): string {
  // Small models can't do date math: say "today", "tomorrow" or the weekday, and who it's for.
  const names = (ids: string[]) => (ctx.everyone ?? ctx.people).filter(p => ids.includes(p.id)).map(p => p.name);
  const events = upcomingEvents(ctx.events, ctx.now, 5).map(e => {
    const who = names(e.profileIds);
    return `- ${e.title}: ${dayWord(e.start, ctx.now)} at ${clockTime(new Date(e.start))}${who.length ? ` (${who.join(', ')})` : ' (everyone)'}`;
  });
  const w = ctx.weather;
  return [
    `You are Huddle, the assistant on the ${ctx.householdName} family's TV home screen. People ask you from their phones.`,
    'Answer in 1-3 short sentences of plain text, no markdown. Be warm and practical. Suitable for kids.',
    'You cannot change devices or the calendar; tell people to use the cards in the Huddle app for that.',
    'Only when asked what to watch: name two real titles that suit everyone in the room, and say the Tonight tile on the TV has more.',
    'Answer calendar questions from the family calendar below; it is complete.',
    kidsLine(ctx.people),
    `In the room now: ${joinNames(ctx.people)}.${ctx.askedBy ? ` ${ctx.askedBy.name} is asking.` : ''}`,
    `Now: ${ctx.now.toString()}.`,
    w ? `Weather in ${w.place}: ${w.tempC}°C, ${weatherSummary(w.code).toLowerCase()}${w.highC !== undefined ? `, high ${w.highC}°C, low ${w.lowC}°C` : ''}.` : 'Weather: unknown.',
    events.length ? `Family calendar:\n${events.join('\n')}` : 'Family calendar: nothing coming up.',
    ctx.devices.length ? `Home devices (simulated): ${ctx.devices.map(d => `${d.name} ${deviceStateLabel(d)}`).join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Converse wants user/assistant alternating and starting with a user turn. Merge or drop turns that break that. */
export function toMessages(turns: ChatContext['turns']): Message[] {
  const out: Message[] = [];
  for (const t of turns) {
    if (!t.text.trim()) continue;
    if (!out.length && t.role !== 'user') continue;
    const last = out[out.length - 1];
    if (last && last.role === t.role) {
      last.content = [{text: `${last.content?.[0]?.text ?? ''}\n${t.text}`}];
    } else {
      out.push({role: t.role, content: [{text: t.text}]});
    }
  }
  return out;
}

import {BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand, Message} from '@aws-sdk/client-bedrock-runtime';
import {TONIGHT_MOODS, TonightPick, deviceStateLabel, upcomingEvents, weatherSummary} from '@huddle/shared';
import {ChatContext, HouseholdAI, TonightContext, joinNames, parsePicksJson} from './types.js';

export interface BedrockAIOptions {
  region: string;
  /** Inference profile ids. Nova needs the `us.` (or `eu.`/`apac.`) cross-region profile, not the bare model id. */
  tonightModel?: string;
  chatModel?: string;
  /** Tests inject a fake with the same `send`. */
  client?: Pick<BedrockRuntimeClient, 'send'>;
}

export const DEFAULT_TONIGHT_MODEL = 'us.amazon.nova-lite-v1:0';
export const DEFAULT_CHAT_MODEL = 'us.amazon.nova-micro-v1:0';

/** Amazon Nova through the Bedrock Converse API. Credentials come from the default AWS chain. */
export class BedrockAI implements HouseholdAI {
  readonly source = 'bedrock' as const;
  private readonly client: Pick<BedrockRuntimeClient, 'send'>;
  private readonly tonightModel: string;
  private readonly chatModel: string;

  constructor(opts: BedrockAIOptions) {
    this.client = opts.client ?? new BedrockRuntimeClient({region: opts.region});
    this.tonightModel = opts.tonightModel ?? DEFAULT_TONIGHT_MODEL;
    this.chatModel = opts.chatModel ?? DEFAULT_CHAT_MODEL;
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
  '{"picks":[{"title":"...","year":2017,"service":"Prime Video","why":"..."}]}',
  'Give exactly 3 picks: real, well-known movies or series that suit everyone in the room.',
  '"why" is one short sentence (under 120 characters) that names the people it suits.',
  '"service" is where it usually streams in the US; prefer Prime Video when it fits.',
].join('\n');

export function tonightPrompt(ctx: TonightContext): string {
  const mood = TONIGHT_MOODS.find(m => m.id === ctx.mood)?.label;
  return [
    `In the room: ${joinNames(ctx.people)}.`,
    mood ? `Mood: ${mood}.` : 'Mood: any; give a mix (one cozy, one funny, one edge-of-seat).',
    `It is ${ctx.now.toDateString()}.`,
  ].join('\n');
}

export function chatSystem(ctx: ChatContext): string {
  const events = upcomingEvents(ctx.events, ctx.now, 5).map(e => `- ${e.title}, ${new Date(e.start).toString()}`);
  const w = ctx.weather;
  return [
    `You are Huddle, the assistant on the ${ctx.householdName} family's TV home screen. People ask you from their phones.`,
    'Answer in 1-3 short sentences of plain text, no markdown. Be warm and practical. Suitable for kids.',
    'You cannot change devices or the calendar; tell people to use the cards in the Huddle app for that.',
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

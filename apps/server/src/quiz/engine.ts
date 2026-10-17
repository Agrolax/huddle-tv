import {GameState, IDLE_GAME, QUIZ_ROUNDS, QuizSource, quizPoints} from '@huddle/shared';
import {QuizItem} from './questions.js';

export interface QuizEngineOptions {
  now: () => number;
  /** How long a question stays open. */
  questionMs: number;
  /** How long the answer shows before the next question. */
  revealMs: number;
  /** Every state change goes out through here. */
  onState: (state: GameState) => void;
  /** Called once when the last reveal ends, with the final scores. */
  onFinish: (state: GameState) => void;
  /** Profiles that can answer right now (people with a phone). When all of them have answered, the reveal starts early. */
  answerers: () => string[];
}

export type AnswerResult = 'ok' | 'stale' | 'already' | 'closed';

/**
 * One household's quiz. Plain state machine with its own timers:
 * idle → loading → (question → reveal) × rounds → final.
 * The answer to the current question never leaves this class until the reveal.
 */
export class QuizEngine {
  private state: GameState = IDLE_GAME;
  private items: QuizItem[] = [];
  private answers = new Map<string, {choice: number; msLeft: number}>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly opts: QuizEngineOptions) {}

  get current(): GameState {
    return this.state;
  }

  /** Show "writing questions" while the caller gathers them. */
  begin(gameId: string, source: QuizSource, title: string): void {
    this.clearTimer();
    this.items = [];
    this.answers.clear();
    this.set({gameId, phase: 'loading', kind: 'quiz', source, title, round: 0, rounds: QUIZ_ROUNDS, answered: [], scores: {}});
  }

  /** Questions are ready. Ignored if this game was ended or replaced meanwhile. */
  load(gameId: string, items: QuizItem[], title: string, aiSource: 'bedrock' | 'mock'): void {
    if (this.state.gameId !== gameId || this.state.phase !== 'loading') return;
    this.items = items.slice(0, QUIZ_ROUNDS);
    if (!this.items.length) {
      this.end(gameId);
      return;
    }
    this.state = {...this.state, title, rounds: this.items.length, aiSource};
    this.ask(1);
  }

  answer(gameId: string, round: number, profileId: string, choice: number): AnswerResult {
    const s = this.state;
    if (s.gameId !== gameId || s.round !== round) return 'stale';
    if (s.phase !== 'question') return 'closed';
    if (this.answers.has(profileId)) return 'already';
    const msLeft = Date.parse(s.endsAt!) - this.opts.now();
    this.answers.set(profileId, {choice, msLeft});
    const scores = profileId in s.scores ? s.scores : {...s.scores, [profileId]: 0};
    this.set({...s, answered: [...s.answered, profileId], scores});
    const waiting = this.opts.answerers().filter(id => !this.answers.has(id));
    if (!waiting.length) this.reveal();
    return 'ok';
  }

  /** Skip ahead. Returns false when there is nothing to skip. */
  next(gameId: string): boolean {
    if (this.state.gameId !== gameId) return false;
    if (this.state.phase === 'question') this.reveal();
    else if (this.state.phase === 'reveal') this.advance();
    else return false;
    return true;
  }

  /** Stop the game. Scores so far are dropped; the league only counts finished games. */
  end(gameId: string): boolean {
    if (this.state.gameId !== gameId || this.state.phase === 'idle') return false;
    this.clearTimer();
    this.items = [];
    this.answers.clear();
    this.set(IDLE_GAME);
    return true;
  }

  dispose(): void {
    this.clearTimer();
  }

  // ---------------------------------------------------------------------------

  private ask(round: number): void {
    const item = this.items[round - 1]!;
    this.answers.clear();
    const s = this.state;
    this.set({
      gameId: s.gameId,
      phase: 'question',
      kind: s.kind,
      source: s.source,
      title: s.title,
      round,
      rounds: s.rounds,
      question: {id: `${s.gameId}-${round}`, text: item.text, choices: item.choices},
      endsAt: new Date(this.opts.now() + this.opts.questionMs).toISOString(),
      answered: [],
      scores: s.scores,
      ...(s.aiSource ? {aiSource: s.aiSource} : {}),
    });
    this.schedule(this.opts.questionMs, () => this.reveal());
  }

  private reveal(): void {
    const s = this.state;
    if (s.phase !== 'question') return;
    const item = this.items[s.round - 1]!;
    const choices: Record<string, number> = {};
    const gained: Record<string, number> = {};
    const scores = {...s.scores};
    for (const [id, a] of this.answers) {
      choices[id] = a.choice;
      gained[id] = quizPoints(a.choice === item.answer, a.msLeft, this.opts.questionMs);
      scores[id] = (scores[id] ?? 0) + gained[id]!;
    }
    this.set({
      ...s,
      phase: 'reveal',
      correct: item.answer,
      choices,
      gained,
      scores,
      endsAt: new Date(this.opts.now() + this.opts.revealMs).toISOString(),
    });
    this.schedule(this.opts.revealMs, () => this.advance());
  }

  private advance(): void {
    const s = this.state;
    if (s.phase !== 'reveal') return;
    if (s.round < s.rounds) return this.ask(s.round + 1);
    this.clearTimer();
    const final: GameState = {
      gameId: s.gameId,
      phase: 'final',
      kind: s.kind,
      source: s.source,
      title: s.title,
      round: s.round,
      rounds: s.rounds,
      answered: [],
      scores: s.scores,
      ...(s.aiSource ? {aiSource: s.aiSource} : {}),
    };
    this.set(final);
    this.opts.onFinish(final);
  }

  private set(state: GameState): void {
    this.state = state;
    this.opts.onState(state);
  }

  private schedule(ms: number, fn: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, ms);
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

import {EMPTY_CANVAS, GameState, IDLE_GAME, SKETCH_DRAWER_POINTS, SketchCanvas, Stroke, guessMatches, quizPoints, titleHint} from '@huddle/shared';

export interface SketchEngineOptions {
  now: () => number;
  /** How long one drawing round lasts. */
  drawMs: number;
  /** How long the answer shows before the next round. */
  revealMs: number;
  onState: (state: GameState) => void;
  /** Called once when the last reveal ends. */
  onFinish: (state: GameState) => void;
  /** A round started: tell the drawer's phone what to draw. */
  onPrompt: (drawerId: string, gameId: string, round: number, prompt: string) => void;
  /** Profiles that can guess (people with a phone). When all but the drawer got it, the round ends early. */
  players: () => string[];
}

/** Keeps one drawing within what a TV can redraw quickly and a snapshot can carry. */
const MAX_STROKES = 300;
const MAX_POINTS = 12_000;

export type StrokeResult = 'ok' | 'stale' | 'not-drawer' | 'full';
export type GuessResult = {result: 'stale' | 'closed' | 'drawer' | 'already'} | {result: 'ok'; correct: boolean};

/**
 * Sketch the pick for one household: each round one phone draws a Tonight
 * candidate, the others guess on their phones. Same phases as the quiz, so
 * the screens and the league treat both alike:
 * idle → (question = drawing → reveal) × rounds → final.
 */
export class SketchEngine {
  private state: GameState = IDLE_GAME;
  private prompts: string[] = [];
  private drawers: string[] = [];
  private strokes: Stroke[] = [];
  private points = 0;
  /** Points each person won this round, applied at the reveal. */
  private gained = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly opts: SketchEngineOptions) {}

  get current(): GameState {
    return this.state;
  }

  get canvas(): SketchCanvas {
    if (!this.state.gameId || this.state.phase === 'final') return EMPTY_CANVAS;
    return {gameId: this.state.gameId, round: this.state.round, strokes: this.strokes};
  }

  /** The current title, for the drawer's phone when it reconnects. */
  get prompt(): string | undefined {
    return this.state.phase === 'question' ? this.prompts[this.state.round - 1] : undefined;
  }

  /** One round per prompt; `drawers` take turns in order. */
  begin(gameId: string, prompts: string[], drawers: string[]): void {
    this.clearTimer();
    this.prompts = prompts;
    this.drawers = drawers;
    const scores = Object.fromEntries(drawers.map(id => [id, 0]));
    this.state = {gameId, phase: 'loading', kind: 'sketch', title: 'Sketch the pick', round: 0, rounds: prompts.length, answered: [], scores};
    this.draw(1);
  }

  stroke(gameId: string, round: number, profileId: string, stroke: Stroke): StrokeResult {
    const s = this.state;
    if (s.gameId !== gameId || s.round !== round || s.phase !== 'question') return 'stale';
    if (s.drawerId !== profileId) return 'not-drawer';
    if (this.points + stroke.points.length > MAX_POINTS) return 'full';
    const existing = this.strokes.find(x => x.id === stroke.id);
    if (existing) {
      existing.points.push(...stroke.points);
    } else {
      if (this.strokes.length >= MAX_STROKES) return 'full';
      this.strokes.push({...stroke, points: [...stroke.points]});
    }
    this.points += stroke.points.length;
    return 'ok';
  }

  clear(gameId: string, round: number, profileId: string): StrokeResult {
    const s = this.state;
    if (s.gameId !== gameId || s.round !== round || s.phase !== 'question') return 'stale';
    if (s.drawerId !== profileId) return 'not-drawer';
    this.strokes = [];
    this.points = 0;
    return 'ok';
  }

  guess(gameId: string, round: number, profileId: string, text: string): GuessResult {
    const s = this.state;
    if (s.gameId !== gameId || s.round !== round) return {result: 'stale'};
    if (s.phase !== 'question') return {result: 'closed'};
    if (s.drawerId === profileId) return {result: 'drawer'};
    if (s.answered.includes(profileId)) return {result: 'already'};
    const correct = guessMatches(text, this.prompts[round - 1]!);
    if (!correct) return {result: 'ok', correct};
    const msLeft = Date.parse(s.endsAt!) - this.opts.now();
    this.gained.set(profileId, quizPoints(true, msLeft, this.opts.drawMs));
    this.gained.set(s.drawerId!, (this.gained.get(s.drawerId!) ?? 0) + SKETCH_DRAWER_POINTS);
    const scores = profileId in s.scores ? s.scores : {...s.scores, [profileId]: 0};
    this.set({...s, answered: [...s.answered, profileId], scores});
    return {result: 'ok', correct};
  }

  /** End the round early once everyone but the drawer got it. Call after telling the screens about the guess. */
  settle(): void {
    const s = this.state;
    if (s.phase !== 'question') return;
    const guessers = this.opts.players().filter(id => id !== s.drawerId);
    if (guessers.length && guessers.every(id => s.answered.includes(id))) this.reveal();
  }

  next(gameId: string): boolean {
    if (this.state.gameId !== gameId) return false;
    if (this.state.phase === 'question') this.reveal();
    else if (this.state.phase === 'reveal') this.advance();
    else return false;
    return true;
  }

  end(gameId: string): boolean {
    if (this.state.gameId !== gameId || this.state.phase === 'idle') return false;
    this.clearTimer();
    this.strokes = [];
    this.points = 0;
    this.gained.clear();
    this.set(IDLE_GAME);
    return true;
  }

  dispose(): void {
    this.clearTimer();
  }

  // ---------------------------------------------------------------------------

  private draw(round: number): void {
    const s = this.state;
    const prompt = this.prompts[round - 1]!;
    const drawerId = this.drawers[(round - 1) % this.drawers.length]!;
    this.strokes = [];
    this.points = 0;
    this.gained.clear();
    this.set({
      gameId: s.gameId,
      phase: 'question',
      kind: 'sketch',
      title: s.title,
      round,
      rounds: s.rounds,
      endsAt: new Date(this.opts.now() + this.opts.drawMs).toISOString(),
      answered: [],
      scores: s.scores,
      drawerId,
      hint: titleHint(prompt),
    });
    this.opts.onPrompt(drawerId, s.gameId!, round, prompt);
    this.schedule(this.opts.drawMs, () => this.reveal());
  }

  private reveal(): void {
    const s = this.state;
    if (s.phase !== 'question') return;
    const gained = Object.fromEntries(this.gained);
    const scores = {...s.scores};
    for (const [id, points] of this.gained) scores[id] = (scores[id] ?? 0) + points;
    this.set({
      ...s,
      phase: 'reveal',
      gained,
      scores,
      answer: this.prompts[s.round - 1]!,
      endsAt: new Date(this.opts.now() + this.opts.revealMs).toISOString(),
    });
    this.schedule(this.opts.revealMs, () => this.advance());
  }

  private advance(): void {
    const s = this.state;
    if (s.phase !== 'reveal') return;
    if (s.round < s.rounds) return this.draw(s.round + 1);
    this.clearTimer();
    const final: GameState = {
      gameId: s.gameId,
      phase: 'final',
      kind: 'sketch',
      title: s.title,
      round: s.round,
      rounds: s.rounds,
      answered: [],
      scores: s.scores,
      answer: s.answer,
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

import {IDLE_VOTE, TonightVote} from '@huddle/shared';

export interface VoteEngineOptions {
  now: () => number;
  /** How long phones have to say yes or no to every pick. */
  votingMs: number;
  /** How long the sudden-death round between the top two lasts. */
  suddenDeathMs: number;
  /** Every state change goes out through here. Never carries a ballot. */
  onState: (vote: TonightVote) => void;
  /** Called once per vote with the pick for tonight (undefined when nobody voted). */
  onDecided: (winner: number | undefined) => void;
  /** Profiles that can vote right now (people with a phone). When all of them have voted, the phase closes early. */
  voters: () => string[];
}

export type VoteResult = 'ok' | 'stale' | 'closed' | 'already' | 'invalid';

/**
 * Secret veto for one household. Ballots stay in this class: screens only
 * learn who has voted, then which picks everyone accepted (or the sudden-death
 * winner). idle → voting → [sudden-death] → result.
 */
export class VoteEngine {
  private state: TonightVote = IDLE_VOTE;
  private ballots = new Map<string, number[]>();
  /** Yes votes per pick from the first round, to break ties in sudden death. */
  private firstRound: number[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly opts: VoteEngineOptions) {}

  get current(): TonightVote {
    return this.state;
  }

  /** Vote on picks 0..count-1. Replaces any vote in progress. */
  start(voteId: string, count: number): void {
    this.ballots.clear();
    this.firstRound = [];
    const options = Array.from({length: count}, (_, i) => i);
    this.open({voteId, phase: 'voting', options, voted: []}, this.opts.votingMs);
  }

  vote(voteId: string, profileId: string, yes: number[]): VoteResult {
    const s = this.state;
    if (s.voteId !== voteId) return 'stale';
    if (s.phase !== 'voting' && s.phase !== 'sudden-death') return 'closed';
    if (this.ballots.has(profileId)) return 'already';
    if (!yes.every(i => s.options.includes(i))) return 'invalid';
    if (s.phase === 'sudden-death' && yes.length !== 1) return 'invalid';
    this.ballots.set(profileId, yes);
    this.set({...s, voted: [...s.voted, profileId]});
    if (this.opts.voters().every(id => this.ballots.has(id))) this.close();
    return 'ok';
  }

  /** Stop waiting for phones. Returns false when there is nothing to close. */
  next(voteId: string): boolean {
    if (this.state.voteId !== voteId || (this.state.phase !== 'voting' && this.state.phase !== 'sudden-death')) return false;
    this.close();
    return true;
  }

  end(voteId: string): boolean {
    if (this.state.voteId !== voteId) return false;
    this.reset();
    return true;
  }

  /** New picks make the old vote meaningless. */
  reset(): void {
    if (this.state.phase === 'idle') return;
    this.clearTimer();
    this.ballots.clear();
    this.set(IDLE_VOTE);
  }

  dispose(): void {
    this.clearTimer();
  }

  // ---------------------------------------------------------------------------

  private close(): void {
    const s = this.state;
    this.clearTimer();
    const counts = s.options.map(i => [...this.ballots.values()].filter(b => b.includes(i)).length);
    if (s.phase === 'voting') {
      if (!this.ballots.size) return this.decide([], undefined, 'nobody');
      const accepted = s.options.filter((_, k) => counts[k] === this.ballots.size);
      if (accepted.length) return this.decide(accepted, accepted[0], 'everyone');
      // Nothing everyone likes: the two with the most yes votes go to sudden death. Ties keep pick order.
      this.firstRound = counts;
      const top = s.options
        .map((i, k) => ({i, n: counts[k]!}))
        .sort((a, b) => b.n - a.n || a.i - b.i)
        .slice(0, 2)
        .map(o => o.i)
        .sort((a, b) => a - b);
      this.ballots.clear();
      this.open({voteId: s.voteId, phase: 'sudden-death', options: top, voted: []}, this.opts.suddenDeathMs);
      return;
    }
    // Sudden death: most votes wins; a tie goes to the pick more people liked in the first round, then pick order.
    const ranked = s.options
      .map((i, k) => ({i, n: counts[k]!, first: this.firstRound[i] ?? 0}))
      .sort((a, b) => b.n - a.n || b.first - a.first || a.i - b.i);
    this.decide([], ranked[0]!.i, 'sudden-death');
  }

  private decide(accepted: number[], winner: number | undefined, decidedBy: NonNullable<TonightVote['decidedBy']>): void {
    this.ballots.clear();
    this.set({
      voteId: this.state.voteId,
      phase: 'result',
      options: this.state.options,
      voted: this.state.voted,
      accepted,
      ...(winner !== undefined ? {winner} : {}),
      decidedBy,
    });
    this.opts.onDecided(winner);
  }

  private open(state: TonightVote, ms: number): void {
    this.set({...state, endsAt: new Date(this.opts.now() + ms).toISOString()});
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.close();
    }, ms);
    this.timer.unref?.();
  }

  private set(state: TonightVote): void {
    this.state = state;
    this.opts.onState(state);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

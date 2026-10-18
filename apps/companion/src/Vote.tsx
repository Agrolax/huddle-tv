import {useEffect, useState} from 'react';
import {TonightPicks, TonightPick, TonightVote} from '@huddle/shared';

function meta(p: TonightPick): string {
  return [p.year, p.service, p.minutes ? `${p.minutes} min` : undefined].filter(Boolean).join(' · ');
}

/**
 * Secret veto on the phone: yes or no to each pick, one at a time, in
 * private. Only the TV shows the result, and only the overlap.
 */
export function VoteCard({
  vote,
  tonight,
  meId,
  myVote,
  onVote,
  onNext,
  onEnd,
  disabled,
}: {
  vote: TonightVote;
  tonight: TonightPicks;
  meId?: string;
  myVote?: string;
  onVote: (voteId: string, phase: string, yes: number[]) => boolean;
  onNext: (voteId: string) => boolean;
  onEnd: (voteId: string) => boolean;
  disabled: boolean;
}) {
  const [step, setStep] = useState(0);
  const [yes, setYes] = useState<number[]>([]);
  const phaseKey = `${vote.voteId}:${vote.phase}`;
  useEffect(() => {
    setStep(0);
    setYes([]);
  }, [phaseKey]);

  const voteId = vote.voteId!;
  const sent = myVote === phaseKey;
  const footer = (
    <div className="row">
      {vote.phase === 'result' ? null : (
        <button className="link" onClick={() => onNext(voteId)} disabled={disabled}>
          Show result
        </button>
      )}
      <span className="grow" />
      <button className="link" onClick={() => onEnd(voteId)} disabled={disabled}>
        {vote.phase === 'result' ? 'Done' : 'Stop vote'}
      </button>
    </div>
  );

  if (vote.phase === 'result') {
    const winner = vote.winner !== undefined ? tonight.picks[vote.winner] : undefined;
    return (
      <section className="card vote" data-testid="vote">
        <p className="eyebrow">Secret veto</p>
        <h2>{winner ? `Tonight: ${winner.title}` : 'Nobody voted.'}</h2>
        <p className="muted small">{vote.decidedBy === 'sudden-death' ? 'Decided in sudden death.' : winner ? 'Everyone said yes.' : ''}</p>
        {footer}
      </section>
    );
  }

  if (!meId) {
    return (
      <section className="card vote" data-testid="vote">
        <p className="eyebrow">Secret veto</p>
        <p className="muted small">Tap your name at the top to vote.</p>
      </section>
    );
  }

  if (sent) {
    return (
      <section className="card vote" data-testid="vote">
        <p className="eyebrow">Secret veto</p>
        <h2>Vote sent</h2>
        <p className="muted small">
          Nobody sees how you voted. {vote.voted.length} voted so far. Look at the TV.
        </p>
        {footer}
      </section>
    );
  }

  if (vote.phase === 'sudden-death') {
    return (
      <section className="card vote" data-testid="vote">
        <p className="eyebrow">Sudden death</p>
        <h2>No pick suits everyone. Choose one.</h2>
        <div className="stack">
          {vote.options.map(i => {
            const p = tonight.picks[i]!;
            return (
              <button key={i} className="pick-button" disabled={disabled} onClick={() => onVote(voteId, vote.phase, [i])}>
                <strong>{p.title}</strong>
                <span className="muted small">{meta(p)}</span>
              </button>
            );
          })}
        </div>
        {footer}
      </section>
    );
  }

  const index = vote.options[step]!;
  const pick = tonight.picks[index]!;
  const answer = (ok: boolean) => {
    const next = ok ? [...yes, index] : yes;
    if (step + 1 < vote.options.length) {
      setYes(next);
      setStep(step + 1);
    } else {
      onVote(voteId, vote.phase, next);
    }
  };
  return (
    <section className="card vote" data-testid="vote">
      <p className="eyebrow">
        Secret veto · {step + 1} of {vote.options.length}
      </p>
      <h2 className="question">{pick.title}</h2>
      <p className="muted small">{meta(pick)}</p>
      <p className="small">{pick.why}</p>
      <div className="vote-buttons">
        <button className="no" disabled={disabled} onClick={() => answer(false)}>
          No
        </button>
        <button className="yes" disabled={disabled} onClick={() => answer(true)}>
          Yes
        </button>
      </div>
      <p className="muted small">Nobody sees your vote. The TV only shows what everyone said yes to.</p>
      {footer}
    </section>
  );
}

import {GameState, League, Profile, choiceLetter, colors, gameIsLive, leaguePoints, standings} from '@huddle/shared';

/**
 * Game night on the phone: start a quiz, answer A–D, see how you did.
 * The question is on the TV too; the phone repeats it so nobody has to squint.
 */
export function GameCard({
  game,
  league,
  profiles,
  meId,
  myAnswer,
  lastPick,
  onStart,
  onAnswer,
  onNext,
  onEnd,
  disabled,
}: {
  game: GameState;
  league: League;
  profiles: Profile[];
  meId?: string;
  myAnswer?: {gameId: string; round: number; choice: number};
  lastPick?: string;
  onStart: (source: 'our-week' | 'watched-it', title?: string) => boolean;
  onAnswer: (gameId: string, round: number, choice: number) => boolean;
  onNext: (gameId: string) => boolean;
  onEnd: (gameId: string) => boolean;
  disabled: boolean;
}) {
  const name = (id: string) => profiles.find(p => p.id === id)?.name ?? 'Someone';
  const mine = myAnswer && myAnswer.gameId === game.gameId && myAnswer.round === game.round ? myAnswer.choice : undefined;

  if (game.phase === 'loading') {
    return (
      <section className="card game" data-testid="game">
        <h2>{game.title}</h2>
        <p className="muted">Writing questions…</p>
      </section>
    );
  }

  if ((game.phase === 'question' || game.phase === 'reveal') && game.question && game.gameId) {
    const reveal = game.phase === 'reveal';
    const gained = meId ? game.gained?.[meId] : undefined;
    return (
      <section className="card game" data-testid="game">
        <div className="row">
          <p className="eyebrow grow">
            {game.title} · Question {game.round} of {game.rounds}
          </p>
        </div>
        <h2 className="question">{game.question.text}</h2>
        {!meId ? <p className="muted small">Tap your name at the top to answer.</p> : null}
        <div className="answers">
          {game.question.choices.map((choice, i) => {
            const right = reveal && game.correct === i;
            const picked = mine === i;
            return (
              <button
                key={i}
                className={`answer ${picked ? 'picked' : ''} ${right ? 'right' : ''} ${reveal && !right ? 'faded' : ''}`}
                style={{['--choice' as string]: colors.choice[i]}}
                aria-pressed={picked}
                aria-label={`${choiceLetter(i)}: ${choice}${right ? ', right answer' : ''}`}
                disabled={disabled || !meId || reveal || mine !== undefined}
                onClick={() => onAnswer(game.gameId!, game.round, i)}>
                <span className="letter" aria-hidden>
                  {choiceLetter(i)}
                </span>
                <span className="grow">{choice}</span>
              </button>
            );
          })}
        </div>
        <p className="muted small" aria-live="polite" data-testid="game-status">
          {reveal
            ? mine === undefined
              ? `The answer is ${choiceLetter(game.correct ?? 0)}.`
              : gained
                ? `Correct. +${gained} points.`
                : `Not this time. The answer is ${choiceLetter(game.correct ?? 0)}.`
            : mine !== undefined
              ? 'Answer sent. Look at the TV.'
              : `${game.answered.length} answered.`}
        </p>
        <div className="row">
          <button className="link" onClick={() => onNext(game.gameId!)} disabled={disabled}>
            {reveal ? 'Next question' : 'Show answer'}
          </button>
          <span className="grow" />
          <button className="link" onClick={() => onEnd(game.gameId!)} disabled={disabled}>
            End game
          </button>
        </div>
      </section>
    );
  }

  const final = game.phase === 'final';
  const leagueRows = standings(
    leaguePoints(league),
    profiles.map(p => p.id),
  );
  const finalRows = standings(
    game.scores,
    profiles.map(p => p.id),
  );
  return (
    <section className="card game" data-testid="game">
      <h2>Game night</h2>
      {final ? (
        <>
          <p className="muted small">{game.title}: final scores</p>
          <ol className="scores" data-testid="game-final">
            {finalRows.map(r => (
              <li key={r.profileId} className={`row ${r.profileId === meId ? 'me' : ''}`}>
                <span className="place">{r.place}</span>
                <span className="grow">{name(r.profileId)}</span>
                <strong>{r.points}</strong>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="muted small">A quiz for everyone in the room. The questions show on the TV. Answer on your phone.</p>
      )}
      <div className="row wrap">
        <button className="primary" onClick={() => onStart('our-week')} disabled={disabled || gameIsLive(game)}>
          Our Week
        </button>
        <button className="chip small-chip" onClick={() => onStart('watched-it', lastPick)} disabled={disabled || gameIsLive(game)}>
          {lastPick ? `Watched It: ${lastPick}` : 'Watched It'}
        </button>
      </div>
      {leagueRows.length ? (
        <>
          <p className="eyebrow">Family league</p>
          <ol className="scores" data-testid="league">
            {leagueRows.map(r => (
              <li key={r.profileId} className={`row ${r.profileId === meId ? 'me' : ''}`}>
                <span className="place">{r.place}</span>
                <span className="grow">{name(r.profileId)}</span>
                <span className="muted small">{league[r.profileId]?.wins ? `${league[r.profileId]!.wins} wins` : ''}</span>
                <strong>{r.points}</strong>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

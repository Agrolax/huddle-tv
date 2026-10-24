import {useEffect, useState} from 'react';
import {MESSAGE_MAX_LENGTH, Profile, gameIsLive, weatherSummary} from '@huddle/shared';
import {useHuddle} from './useHuddle';
import {ChatCard, TonightCard} from './AI';
import {CalendarCard, SmartHomeCard} from './Widgets';
import {GameCard} from './Game';
import {VoteCard} from './Vote';
import {Avatar, WhoAmI} from './Profiles';

export function App() {
  const huddle = useHuddle();
  const {status, snapshot, error} = huddle;
  // During a game the card moves to the top, right under "Who are you?".
  const game = snapshot ? (
    <GameCard
      game={huddle.game}
      league={huddle.league}
      profiles={snapshot.profiles}
      meId={huddle.meId}
      myAnswer={huddle.myAnswer}
      lastPick={huddle.tonight?.picks[huddle.tonight.chosen ?? 0]?.title}
      onStart={huddle.startQuiz}
      onAnswer={huddle.answerQuiz}
      onNext={huddle.nextGameStep}
      onEnd={huddle.endGame}
      onStartSketch={huddle.startSketch}
      sketch={{
        prompt: huddle.prompt,
        myGuesses: huddle.myGuesses,
        othersGot: huddle.othersGot,
        onStroke: huddle.sendStroke,
        onClear: huddle.clearSketch,
        onGuess: huddle.guess,
      }}
      disabled={status !== 'open'}
    />
  ) : null;
  const voting = huddle.vote.phase !== 'idle' && huddle.tonight;

  if (status === 'unpaired') {
    return (
      <Shell>
        <Empty title="Scan the code on your TV" body="On the TV, open Huddle and select Connect phone. Scan the code with your camera." />
      </Shell>
    );
  }

  if (status === 'failed') {
    return (
      <Shell>
        <Empty
          title={error?.code === 'pair-code-expired' ? 'The code expired' : 'Cannot connect to the TV'}
          body={`${error?.message ?? 'The TV did not accept this phone.'} On the TV, select Connect phone. Scan the new code.`}
        />
      </Shell>
    );
  }

  if (!snapshot) {
    return (
      <Shell>
        <Empty title="Connecting to your TV…" body={status === 'reconnecting' ? 'Still trying. Use the same Wi-Fi on your phone and TV.' : ''} />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="header">
        <p className="eyebrow">Huddle</p>
        <h1>{snapshot.name}</h1>
        {huddle.weather ? (
          <p className="muted small" data-testid="weather">
            {huddle.weather.tempC}° {weatherSummary(huddle.weather.code).toLowerCase()} · {huddle.weather.place}
          </p>
        ) : null}
        <p className={`pill ${status === 'open' ? 'ok' : 'warn'}`} data-testid="status">
          <span className="dot" /> {status === 'open' ? 'Connected to the TV' : 'Reconnecting…'}
        </p>
      </header>
      <WhoAmI profiles={snapshot.profiles} meId={huddle.meId} onPick={huddle.setMe} onSave={huddle.saveProfile} disabled={status !== 'open'} />
      {voting ? (
        <VoteCard
          vote={huddle.vote}
          tonight={huddle.tonight!}
          meId={huddle.meId}
          myVote={huddle.myVote}
          onVote={huddle.castVote}
          onNext={huddle.voteNext}
          onEnd={huddle.endVote}
          disabled={status !== 'open'}
        />
      ) : null}
      {gameIsLive(huddle.game) ? game : null}
      <WhoIsWatching profiles={snapshot.profiles} active={huddle.activeProfileIds} onChange={huddle.switchProfiles} disabled={status !== 'open'} />
      <SendMessage onSend={huddle.sendMessage} disabled={status !== 'open'} lastSentAt={huddle.lastSent?.at} />
      <ChatCard chat={huddle.chat} onAsk={huddle.ask} onReset={huddle.resetChat} disabled={status !== 'open'} />
      <TonightCard
        tonight={huddle.tonight}
        loading={huddle.tonightLoading}
        profiles={snapshot.profiles}
        activeProfileIds={huddle.activeProfileIds}
        onRequest={huddle.requestTonight}
        onVote={huddle.startVote}
        voting={Boolean(voting)}
        disabled={status !== 'open'}
      />
      <CalendarCard
        events={huddle.events}
        profiles={snapshot.profiles}
        meId={huddle.meId}
        onAdd={huddle.addEvent}
        onRemove={huddle.removeEvent}
        disabled={status !== 'open'}
      />
      <SmartHomeCard devices={huddle.devices} onSet={huddle.setDevice} onRingDoor={huddle.ringDoor} disabled={status !== 'open'} />
      {gameIsLive(huddle.game) ? null : game}
    </Shell>
  );
}

function Shell({children}: {children: React.ReactNode}) {
  return <main className="shell">{children}</main>;
}

function Empty({title, body}: {title: string; body: string}) {
  return (
    <section className="empty">
      <p className="eyebrow">Huddle</p>
      <h1>{title}</h1>
      {body ? <p className="muted">{body}</p> : null}
    </section>
  );
}

function WhoIsWatching({
  profiles,
  active,
  onChange,
  disabled,
}: {
  profiles: Profile[];
  active: string[];
  onChange: (ids: string[]) => boolean;
  disabled: boolean;
}) {
  const [hint, setHint] = useState('');
  return (
    <section className="card">
      <h2>Who's here</h2>
      <p className="muted small">Tap a person to add or remove them. The TV changes immediately.</p>
      <div className="grid">
        {profiles.map(p => {
          const on = active.includes(p.id);
          return (
            <button
              key={p.id}
              className={`person ${on ? 'on' : ''}`}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => {
                const next = on ? active.filter(id => id !== p.id) : [...active, p.id];
                if (!next.length) {
                  setHint('Select at least one person.');
                  return;
                }
                setHint('');
                onChange(next);
              }}>
              <Avatar profile={p} />
              <span>{p.name}</span>
              <span className="check" aria-hidden>
                {on ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {hint ? <p className="muted small">{hint}</p> : null}
    </section>
  );
}

function SendMessage({onSend, disabled, lastSentAt}: {onSend: (text: string) => boolean; disabled: boolean; lastSentAt?: string}) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const length = [...text].length;
  const tooLong = length > MESSAGE_MAX_LENGTH;

  useEffect(() => {
    if (!lastSentAt) return;
    setSent(true);
    const t = setTimeout(() => setSent(false), 2500);
    return () => clearTimeout(t);
  }, [lastSentAt]);

  return (
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        if (onSend(text)) setText('');
      }}>
      <h2>
        <label htmlFor="msg">Send a message to the TV</label>
      </h2>
      <textarea
        id="msg"
        rows={3}
        value={text}
        maxLength={MESSAGE_MAX_LENGTH * 2}
        placeholder="Pizza night 🍕"
        onChange={e => setText(e.target.value)}
        disabled={disabled}
      />
      <div className="row">
        <span className={`small grow ${tooLong ? 'error' : 'muted'}`}>
          {length}/{MESSAGE_MAX_LENGTH}
        </span>
        {sent ? <span className="small ok-text">Sent to the TV ✓</span> : null}
        <button type="submit" className="primary" disabled={disabled || !text.trim() || tooLong}>
          Send
        </button>
      </div>
    </form>
  );
}

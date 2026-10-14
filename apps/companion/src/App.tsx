import {useEffect, useState} from 'react';
import {MESSAGE_MAX_LENGTH, Profile} from '@huddle/shared';
import {useHuddle} from './useHuddle';

export function App() {
  const huddle = useHuddle();
  const {status, snapshot, error} = huddle;

  if (status === 'unpaired') {
    return (
      <Shell>
        <Empty title="Scan the code on your TV" body={'On the TV, open Huddle and choose "Connect phone". Point your camera at the QR code.'} />
      </Shell>
    );
  }

  if (status === 'failed') {
    return (
      <Shell>
        <Empty
          title={error?.code === 'pair-code-expired' ? 'That code expired' : "Couldn't join"}
          body={`${error?.message ?? 'The TV did not accept this phone.'} Open "Connect phone" on the TV and scan the new code.`}
        />
      </Shell>
    );
  }

  if (!snapshot) {
    return (
      <Shell>
        <Empty title="Connecting to your TV…" body={status === 'reconnecting' ? 'Still trying. Is your phone on the same Wi-Fi as the TV?' : ''} />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="header">
        <p className="eyebrow">Huddle</p>
        <h1>{snapshot.name}</h1>
        <p className={`pill ${status === 'open' ? 'ok' : 'warn'}`} data-testid="status">
          <span className="dot" /> {status === 'open' ? 'Connected to the TV' : 'Reconnecting…'}
        </p>
      </header>
      <WhoAmI profiles={snapshot.profiles} meId={huddle.meId} onPick={huddle.setMe} />
      <WhoIsWatching profiles={snapshot.profiles} active={huddle.activeProfileIds} onChange={huddle.switchProfiles} disabled={status !== 'open'} />
      <SendMessage onSend={huddle.sendMessage} disabled={status !== 'open'} lastSentAt={huddle.lastSent?.at} />
      <section className="card soon">
        <button disabled>Ask the AI <small>coming soon</small></button>
        <button disabled>Sketch it <small>coming soon</small></button>
      </section>
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

function Avatar({profile, size = 56}: {profile: Profile; size?: number}) {
  return (
    <span className="avatar" style={{background: profile.color, width: size, height: size, fontSize: size * 0.42}} aria-hidden>
      {profile.name[0]}
    </span>
  );
}

function WhoAmI({profiles, meId, onPick}: {profiles: Profile[]; meId?: string; onPick: (id: string) => void}) {
  const [editing, setEditing] = useState(!meId);
  const me = profiles.find(p => p.id === meId);
  if (me && !editing) {
    return (
      <section className="card row">
        <Avatar profile={me} size={40} />
        <p className="grow">
          You're <strong>{me.name}</strong>
        </p>
        <button className="link" onClick={() => setEditing(true)}>
          Change
        </button>
      </section>
    );
  }
  return (
    <section className="card">
      <h2>Who are you?</h2>
      <div className="chips">
        {profiles.map(p => (
          <button
            key={p.id}
            className={`chip ${p.id === meId ? 'on' : ''}`}
            aria-pressed={p.id === meId}
            onClick={() => {
              onPick(p.id);
              setEditing(false);
            }}>
            <Avatar profile={p} size={40} />
            {p.name}
          </button>
        ))}
      </div>
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
      <h2>Who's watching</h2>
      <p className="muted small">Tap to add or remove. The TV updates right away.</p>
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
                  setHint('Someone has to be watching.');
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

import {useEffect, useRef, useState} from 'react';
import {CHAT_MAX_LENGTH, Profile, TMDB_ATTRIBUTION, TONIGHT_MOODS, TonightMood, TonightPicks} from '@huddle/shared';
import type {ChatState} from './useHuddle';

const SUGGESTIONS = ['What should we watch?', "What's on the calendar?", 'Do I need a jacket?'];

export function ChatCard({
  chat,
  onAsk,
  onReset,
  disabled,
}: {
  chat: ChatState;
  onAsk: (text: string) => boolean;
  onReset: () => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const length = [...text].length;
  const tooLong = length > CHAT_MAX_LENGTH;
  const last = chat.lines[chat.lines.length - 1];
  const waiting = chat.streaming && last?.role === 'user';

  useEffect(() => {
    listRef.current?.scrollTo({top: listRef.current.scrollHeight});
  }, [chat.lines]);

  const ask = (q: string) => {
    if (onAsk(q)) setText('');
  };

  return (
    <section className="card" data-testid="chat">
      <div className="row">
        <h2 className="grow">Ask the AI</h2>
        {chat.lines.length ? (
          <button className="link" onClick={onReset} disabled={chat.streaming}>
            New chat
          </button>
        ) : null}
      </div>
      {chat.lines.length ? (
        <div className="chat" ref={listRef} aria-live="polite">
          {chat.lines.map((l, i) => (
            <p key={i} className={`bubble ${l.role}`}>
              {l.text}
              {chat.streaming && i === chat.lines.length - 1 && l.role === 'assistant' ? <span className="caret" aria-hidden /> : null}
            </p>
          ))}
          {waiting ? <p className="bubble assistant muted">Thinking…</p> : null}
        </div>
      ) : (
        <>
          <p className="muted small">It knows who's here, the family calendar, the weather and the home.</p>
          <div className="chips">
            {SUGGESTIONS.map(q => (
              <button key={q} className="chip small-chip" onClick={() => ask(q)} disabled={disabled || chat.streaming}>
                {q}
              </button>
            ))}
          </div>
        </>
      )}
      <form
        className="row"
        onSubmit={e => {
          e.preventDefault();
          ask(text);
        }}>
        <input
          aria-label="Ask the AI"
          placeholder="Ask anything…"
          value={text}
          maxLength={CHAT_MAX_LENGTH * 2}
          onChange={e => setText(e.target.value)}
          disabled={disabled}
          enterKeyHint="send"
        />
        <button type="submit" className="primary" disabled={disabled || chat.streaming || !text.trim() || tooLong}>
          Ask
        </button>
      </form>
      {tooLong ? (
        <p className="small error">
          {length}/{CHAT_MAX_LENGTH}
        </p>
      ) : null}
    </section>
  );
}

export function TonightCard({
  tonight,
  loading,
  profiles,
  activeProfileIds,
  onRequest,
  onVote,
  voting,
  disabled,
}: {
  tonight: TonightPicks | null;
  loading: boolean;
  profiles: Profile[];
  activeProfileIds: string[];
  onRequest: (mood?: TonightMood) => boolean;
  onVote: () => boolean;
  voting: boolean;
  disabled: boolean;
}) {
  const [mood, setMood] = useState<TonightMood | undefined>(undefined);
  const here = profiles.filter(p => activeProfileIds.includes(p.id)).map(p => p.name);
  const forNames = tonight ? profiles.filter(p => tonight.forProfileIds.includes(p.id)).map(p => p.name) : [];

  return (
    <section className="card" data-testid="tonight">
      <h2>Tonight</h2>
      <p className="muted small">Three picks for {here.join(', ') || 'everyone'}. They show on the TV too.</p>
      {tonight?.endsBy ? (
        <p className="small" data-testid="ends-by">
          Ends by {tonight.endsBy.label} ({tonight.endsBy.reason})
        </p>
      ) : null}
      <div className="chips">
        {TONIGHT_MOODS.map(m => (
          <button
            key={m.id}
            className={`chip small-chip ${mood === m.id ? 'on' : ''}`}
            aria-pressed={mood === m.id}
            onClick={() => setMood(mood === m.id ? undefined : m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => onRequest(mood)} disabled={disabled || loading}>
        {loading ? 'Finding picks…' : 'Get Tonight picks'}
      </button>
      {tonight ? (
        <ul className="list picks">
          {tonight.picks.map((p, i) => (
            <li key={`${p.title}-${i}`}>
              <strong>{p.title}</strong>
              <span className="muted small"> {[p.year, p.service, p.minutes ? `${p.minutes} min` : undefined].filter(Boolean).join(' · ')}</span>
              {tonight.chosen === i ? <span className="small ok-text"> · Tonight's pick</span> : null}
              <p className="small grow">{p.why}</p>
            </li>
          ))}
          <li className="muted small">
            For {forNames.join(', ')}
            {tonight.mood ? ` · ${TONIGHT_MOODS.find(m => m.id === tonight.mood)?.label}` : ''}
            {tonight.source === 'mock' ? ' · demo picks' : ''}
          </li>
        </ul>
      ) : null}
      {tonight?.picks.some(p => p.posterUrl) ? (
        <p className="muted small" data-testid="tmdb-credit">
          {TMDB_ATTRIBUTION}
        </p>
      ) : null}
      {tonight && tonight.picks.length >= 2 && !voting ? (
        <button className="chip small-chip" onClick={onVote} disabled={disabled || loading}>
          Vote in secret on these picks
        </button>
      ) : null}
    </section>
  );
}

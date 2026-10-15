import {useState} from 'react';
import {
  CalendarEvent,
  EVENT_TITLE_MAX_LENGTH,
  Profile,
  SmartDevice,
  THERMOSTAT_RANGE,
  deviceStateLabel,
  eventWhen,
  upcomingEvents,
} from '@huddle/shared';

/** yyyy-mm-dd and hh:mm in local time, for <input type=date|time>. */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nextHour(): {date: string; time: string} {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return {date: localDate(d), time: `${String(d.getHours()).padStart(2, '0')}:00`};
}

export function CalendarCard({
  events,
  profiles,
  meId,
  onAdd,
  onRemove,
  disabled,
}: {
  events: CalendarEvent[];
  profiles: Profile[];
  meId?: string;
  onAdd: (e: {title: string; start: string; profileIds: string[]}) => boolean;
  onRemove: (id: string) => boolean;
  disabled: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [{date, time}, setWhen] = useState(nextHour);
  const [who, setWho] = useState<string[]>(meId ? [meId] : []);
  const now = new Date();
  const upcoming = upcomingEvents(events, now, 6);
  const start = new Date(`${date}T${time}`);
  const valid = title.trim().length > 0 && !Number.isNaN(start.getTime());

  return (
    <section className="card">
      <div className="row">
        <h2 className="grow">Family calendar</h2>
        {!adding ? (
          <button className="link" onClick={() => setAdding(true)} disabled={disabled}>
            + Add
          </button>
        ) : null}
      </div>
      {upcoming.length ? (
        <ul className="list">
          {upcoming.map(e => (
            <li key={e.id} className="row">
              <span className="when">{eventWhen(e.start, now)}</span>
              <span className="grow">
                {e.title}
                {e.profileIds.length ? (
                  <span className="muted"> · {profiles.filter(p => e.profileIds.includes(p.id)).map(p => p.name).join(', ')}</span>
                ) : null}
              </span>
              <button className="link small" aria-label={`Remove ${e.title}`} onClick={() => onRemove(e.id)} disabled={disabled}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Nothing coming up.</p>
      )}
      {adding ? (
        <form
          className="stack"
          onSubmit={ev => {
            ev.preventDefault();
            if (!valid) return;
            if (onAdd({title, start: start.toISOString(), profileIds: who})) {
              setTitle('');
              setWhen(nextHour());
              setAdding(false);
            }
          }}>
          <input
            aria-label="What"
            placeholder="Dentist, pizza night…"
            value={title}
            maxLength={EVENT_TITLE_MAX_LENGTH}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <div className="row">
            <input aria-label="Day" type="date" value={date} onChange={e => setWhen(w => ({...w, date: e.target.value}))} />
            <input aria-label="Time" type="time" value={time} onChange={e => setWhen(w => ({...w, time: e.target.value}))} />
          </div>
          <p className="muted small">Who's it for? {who.length ? '' : 'Nobody picked means the whole family.'}</p>
          <div className="chips">
            {profiles.map(p => {
              const on = who.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`chip small-chip ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setWho(w => (on ? w.filter(id => id !== p.id) : [...w, p.id]))}>
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="row">
            <button type="button" className="link" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <span className="grow" />
            <button type="submit" className="primary" disabled={disabled || !valid}>
              Add to TV
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export function SmartHomeCard({
  devices,
  onSet,
  disabled,
}: {
  devices: SmartDevice[];
  onSet: (id: string, change: {on?: boolean; level?: number}) => boolean;
  disabled: boolean;
}) {
  if (!devices.length) return null;
  return (
    <section className="card">
      <h2>Home</h2>
      <p className="muted small">Simulated devices. The TV shows changes right away.</p>
      <ul className="list">
        {devices.map(d => (
          <li key={d.id} className="row device">
            <span className="grow">
              {d.name}
              <span className="muted small"> · {d.room}</span>
            </span>
            {d.kind === 'thermostat' ? (
              <span className="row stepper">
                <button
                  aria-label="Cooler"
                  disabled={disabled || (d.level ?? 21) <= THERMOSTAT_RANGE.min}
                  onClick={() => onSet(d.id, {level: (d.level ?? 21) - 1})}>
                  −
                </button>
                <strong>{deviceStateLabel(d)}</strong>
                <button
                  aria-label="Warmer"
                  disabled={disabled || (d.level ?? 21) >= THERMOSTAT_RANGE.max}
                  onClick={() => onSet(d.id, {level: (d.level ?? 21) + 1})}>
                  +
                </button>
              </span>
            ) : (
              <button
                role="switch"
                aria-checked={Boolean(d.on)}
                aria-label={`${d.name}: ${deviceStateLabel(d)}`}
                className={`switch ${d.on ? 'on' : ''}`}
                disabled={disabled}
                onClick={() => onSet(d.id, {on: !d.on})}>
                {deviceStateLabel(d)}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

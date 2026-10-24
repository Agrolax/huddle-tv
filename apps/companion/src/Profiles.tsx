import {useState} from 'react';
import {AVATAR_COLORS, BLOB_EYE_RADIUS, BLOB_INK, BLOB_KINDS, BLOB_PUPIL_RADIUS, BlobKind, PROFILE_NAME_MAX_LENGTH, Profile, blobFor, isBlobKind} from '@huddle/shared';

type Saved = {profileId?: string; name: string; color: string; avatar: string; kid?: boolean};

/** The same blob the TV draws (packages/shared/src/avatars.ts). */
export function Avatar({profile, size = 56}: {profile: Pick<Profile, 'id' | 'color' | 'avatar'>; size?: number}) {
  const blob = blobFor(profile);
  return (
    <svg className="blob" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path d={blob.body} fill={profile.color} />
      {blob.eyes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={BLOB_EYE_RADIUS} fill="#fff" />
          <circle cx={x + 1.5} cy={y + 1.5} r={BLOB_PUPIL_RADIUS} fill={BLOB_INK} />
        </g>
      ))}
      <path d={blob.mouth} stroke={BLOB_INK} strokeWidth={4} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * "Who are you?" and your own card. From here a phone edits its person (name,
 * blob, color) or adds someone new. The TV never asks anyone to type.
 */
export function WhoAmI({
  profiles,
  meId,
  onPick,
  onSave,
  disabled,
}: {
  profiles: Profile[];
  meId?: string;
  onPick: (id: string) => void;
  onSave: (profile: Saved, claim: boolean) => boolean;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<'pick' | 'me' | 'edit' | 'add' | 'add-me'>(meId ? 'me' : 'pick');
  const me = profiles.find(p => p.id === meId);

  if (mode === 'edit' && me) {
    return <ProfileForm title="Edit your profile" initial={me} onCancel={() => setMode('me')} onSave={p => onSave({...p, profileId: me.id}, false) && (setMode('me'), true)} disabled={disabled} />;
  }
  if (mode === 'add' || mode === 'add-me') {
    const claim = mode === 'add-me';
    return (
      <ProfileForm
        title={claim ? 'Add yourself' : 'Add someone'}
        initial={{name: '', color: AVATAR_COLORS[profiles.length % AVATAR_COLORS.length]!, avatar: BLOB_KINDS[profiles.length % BLOB_KINDS.length]}}
        onCancel={() => setMode(meId ? 'me' : 'pick')}
        onSave={p => onSave(p, claim) && (setMode('me'), true)}
        disabled={disabled}
      />
    );
  }

  if (me && mode === 'me') {
    return (
      <section className="card">
        <div className="row">
          <Avatar profile={me} size={56} />
          <p className="grow">
            You're <strong>{me.name}</strong>
          </p>
          <button className="link" onClick={() => setMode('edit')} disabled={disabled}>
            Edit
          </button>
          <button className="link" onClick={() => setMode('pick')}>
            Change
          </button>
        </div>
        <button className="ghost" onClick={() => setMode('add')} disabled={disabled}>
          + Add someone
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Who are you?</h2>
      <div className="people">
        {profiles.map(p => (
          <button
            key={p.id}
            className={`tile ${p.id === meId ? 'on' : ''}`}
            aria-pressed={p.id === meId}
            onClick={() => {
              onPick(p.id);
              setMode('me');
            }}>
            <Avatar profile={p} size={64} />
            <span>{p.name}</span>
          </button>
        ))}
        <button className="tile add" onClick={() => setMode('add-me')} disabled={disabled}>
          <span className="plus" aria-hidden>
            +
          </span>
          <span>I'm new</span>
        </button>
      </div>
    </section>
  );
}

function ProfileForm({
  title,
  initial,
  onSave,
  onCancel,
  disabled,
}: {
  title: string;
  initial: Pick<Profile, 'name' | 'color' | 'avatar' | 'kid'>;
  onSave: (p: Saved) => boolean;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [avatar, setAvatar] = useState<BlobKind>(isBlobKind(initial.avatar) ? initial.avatar : 'bean');
  const [kid, setKid] = useState(Boolean(initial.kid));
  const ok = name.trim().length > 0 && [...name.trim()].length <= PROFILE_NAME_MAX_LENGTH;

  return (
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        if (ok) onSave({name, color, avatar, kid});
      }}>
      <div className="row">
        <Avatar profile={{id: 'preview', color, avatar}} size={72} />
        <h2 className="grow">{title}</h2>
      </div>
      <label className="small muted" htmlFor="profile-name">
        Name
      </label>
      <input id="profile-name" value={name} maxLength={PROFILE_NAME_MAX_LENGTH} placeholder="Name" autoComplete="off" onChange={e => setName(e.target.value)} />
      <p className="small muted">Look</p>
      <div className="swatches" role="radiogroup" aria-label="Blob">
        {BLOB_KINDS.map(kind => (
          <button type="button" key={kind} role="radio" aria-checked={avatar === kind} aria-label={kind} className={`swatch blob-pick ${avatar === kind ? 'on' : ''}`} onClick={() => setAvatar(kind)}>
            <Avatar profile={{id: kind, color, avatar: kind}} size={48} />
          </button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Color">
        {AVATAR_COLORS.map(c => (
          <button type="button" key={c} role="radio" aria-checked={color === c} aria-label={c} className={`swatch color ${color === c ? 'on' : ''}`} style={{background: c}} onClick={() => setColor(c)} />
        ))}
      </div>
      <label className="row small">
        <input type="checkbox" className="check" checked={kid} onChange={e => setKid(e.target.checked)} />
        A kid (Tonight picks end by bedtime)
      </label>
      <div className="row">
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
        <span className="grow" />
        <button type="submit" className="primary" disabled={disabled || !ok}>
          Save
        </button>
      </div>
    </form>
  );
}

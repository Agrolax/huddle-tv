import {colors, type ClientMessage} from '@huddle/shared';

const ACTIONS: {label: string; message: ClientMessage['type']}[] = [
  {label: 'Switch profile', message: 'profile:switch'},
  {label: 'Send a message to the TV', message: 'message:send'},
  {label: 'Ask the AI', message: 'chat:ask'},
  {label: 'Draw in Sketch it', message: 'sketch:stroke'},
];

/** Placeholder: pairing and the real actions land in the companion step. */
export function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '24px 16px',
        background: colors.bg,
        color: colors.ink,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
      <h1 style={{fontSize: 28, margin: '0 0 8px'}}>Huddle</h1>
      <p style={{color: colors.mute, margin: '0 0 24px'}}>Scan the QR code on the TV to join your household.</p>
      {ACTIONS.map(a => (
        <button
          key={a.message}
          disabled
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            marginBottom: 12,
            fontSize: 18,
            borderRadius: 12,
            border: 'none',
            background: colors.surface,
            color: colors.mute,
            textAlign: 'left',
          }}>
          {a.label}
        </button>
      ))}
    </main>
  );
}

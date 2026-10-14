/** What the phone remembers between visits: which household, its session token, and who "I" am. */
export interface Session {
  householdId: string;
  pairCode?: string;
  token?: string;
  clientId: string;
  /** The profile messages are sent from. */
  meId?: string;
}

const KEY = 'huddle.session.v1';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode: the session just won't survive a reload.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function newClientId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `phone-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Server URL: `?s=` (for testing), else VITE_HUDDLE_SERVER_URL, else the host
 * that served this page on port 8787. The QR points at the Mac's LAN IP, so
 * "same host" is the server.
 */
export function serverUrl(search: string, location: {hostname: string; protocol: string}): string {
  const fromQuery = new URLSearchParams(search).get('s');
  if (fromQuery) return fromQuery;
  const fromEnv = import.meta.env.VITE_HUDDLE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.hostname}:8787/ws`;
}

/** Pair codes and join URLs, shared by the server (issues), TV (shows) and companion (reads). */

/** No 0/O, 1/I/L: the code is also read aloud and typed. */
export const PAIR_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const PAIR_CODE_LENGTH = 6;
/** How long a pair code works. The TV asks for a fresh one before it runs out. */
export const PAIR_CODE_TTL_MS = 10 * 60 * 1000;

/** `random` returns a float in [0, 1); pass a crypto-backed one on the server. */
export function generatePairCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < PAIR_CODE_LENGTH; i++) {
    code += PAIR_CODE_ALPHABET[Math.floor(random() * PAIR_CODE_ALPHABET.length)];
  }
  return code;
}

/** Case-insensitive; strips spaces and dashes so "h7k-2qp" works. */
export function normalizePairCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isPairCode(input: string): boolean {
  const code = normalizePairCode(input);
  if (code.length !== PAIR_CODE_LENGTH) return false;
  for (const ch of code) if (!PAIR_CODE_ALPHABET.includes(ch)) return false;
  return true;
}

/** "H7K2QP" → "H7K 2QP" for display on the TV. */
export function formatPairCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** Companion URL + `?h=<householdId>&c=<code>`. Keeps any existing query/hash on `base`. */
export function buildJoinUrl(base: string, householdId: string, code: string): string {
  const [beforeHash, hash] = base.split('#', 2);
  const sep = beforeHash!.includes('?') ? '&' : '?';
  const url = `${beforeHash}${sep}h=${encodeURIComponent(householdId)}&c=${encodeURIComponent(code)}`;
  return hash !== undefined ? `${url}#${hash}` : url;
}

/** Reads one query parameter. Hand-rolled: React Native 0.72's URLSearchParams has no `get`. */
export function queryParam(search: string, name: string): string | undefined {
  const query = search.startsWith('?') ? search.slice(1) : search;
  for (const part of query.split('&')) {
    const [key, value = ''] = part.split('=', 2);
    if (key && decodeURIComponent(key) === name) return decodeURIComponent(value.replace(/\+/g, ' '));
  }
  return undefined;
}

/** Reads `h` and `c` from a query string (`location.search`). */
export function parseJoinParams(search: string): {householdId: string; pairCode: string} | null {
  let householdId: string | undefined;
  let code: string | undefined;
  try {
    householdId = queryParam(search, 'h')?.trim();
    code = queryParam(search, 'c');
  } catch {
    return null; // malformed %-escape
  }
  if (!householdId || !code || !isPairCode(code)) return null;
  return {householdId, pairCode: normalizePairCode(code)};
}

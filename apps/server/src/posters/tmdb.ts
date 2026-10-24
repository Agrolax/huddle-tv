import type {TonightPick} from '@huddle/shared';

const SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

export interface PosterLookup {
  /** Add `posterUrl` where TMDB has a poster. Never throws. */
  attach(picks: TonightPick[]): Promise<TonightPick[]>;
}

type FetchLike = (url: string, init?: {headers?: Record<string, string>; signal?: AbortSignal}) => Promise<{ok: boolean; status: number; json(): Promise<unknown>}>;

export interface TmdbPosterOptions {
  /** v3 API key, sent as `api_key`. Preferred when both are set. */
  apiKey?: string;
  /** v4 read access token, sent as `Authorization: Bearer`. */
  readToken?: string;
  fetchFn?: FetchLike;
  log?: (msg: string) => void;
}

/** `https://image.tmdb.org/t/p/w342/<path>`. `poster_path` already starts with `/`. */
export function tmdbImageUrl(posterPath: string): string {
  const path = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return `${IMAGE_BASE}${path}`;
}

/** A TMDB `poster_path`: a root-relative file path, nothing else. */
export function isPosterPath(path: string): boolean {
  return path.startsWith('/') && path.length > 1 && !path.includes('..') && !/[\s?#\\]/.test(path);
}

function cacheKey(title: string, year?: number): string {
  return `${title.trim().toLowerCase()}|${year ?? ''}`;
}

function searchUrl(title: string, year: number | undefined, apiKey?: string): string {
  const q = new URLSearchParams({query: title.trim(), include_adult: 'false'});
  if (year !== undefined) q.set('year', String(year));
  if (apiKey) q.set('api_key', apiKey);
  return `${SEARCH_URL}?${q}`;
}

/** First result that actually has artwork. */
export function firstPosterPath(body: unknown): string | null {
  const results = (body as {results?: unknown})?.results;
  if (!Array.isArray(results)) return null;
  for (const item of results) {
    const path = (item as {poster_path?: unknown})?.poster_path;
    if (typeof path === 'string' && isPosterPath(path)) return path;
  }
  return null;
}

/**
 * Looks up Tonight titles on TMDB and remembers poster URLs (and misses) for
 * the life of the process. Network errors are not cached, so the next request
 * can try again. Series often miss `/search/movie`; those stay text cards.
 */
export class TmdbPosters implements PosterLookup {
  private readonly apiKey?: string;
  private readonly readToken?: string;
  private readonly fetchFn: FetchLike;
  private readonly log: (msg: string) => void;
  /** `title|year` → image URL, or null when TMDB had no poster. */
  private readonly cache = new Map<string, string | null>();

  constructor(opts: TmdbPosterOptions) {
    this.apiKey = opts.apiKey;
    this.readToken = opts.readToken;
    this.fetchFn = opts.fetchFn ?? (fetch as unknown as FetchLike);
    this.log = opts.log ?? (() => {});
  }

  async attach(picks: TonightPick[]): Promise<TonightPick[]> {
    const urls = await Promise.all(picks.map(p => this.lookup(p.title, p.year)));
    return picks.map((p, i) => (urls[i] ? {...p, posterUrl: urls[i]} : p));
  }

  private async lookup(title: string, year?: number): Promise<string | undefined> {
    const trimmed = title.trim();
    if (!trimmed) return undefined;
    const key = cacheKey(trimmed, year);
    if (this.cache.has(key)) return this.cache.get(key) ?? undefined;

    try {
      const url = await this.resolve(trimmed, year);
      this.cache.set(key, url);
      return url ?? undefined;
    } catch (e) {
      this.log(`poster lookup failed for "${trimmed}": ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
  }

  /** Year filter first. A miss falls back to the title alone, and that result is cached too. */
  private async resolve(title: string, year?: number): Promise<string | null> {
    const direct = await this.search(title, year);
    if (direct || year === undefined) return direct;
    const bare = cacheKey(title);
    if (this.cache.has(bare)) return this.cache.get(bare) ?? null;
    const broad = await this.search(title);
    this.cache.set(bare, broad);
    return broad;
  }

  private async search(title: string, year?: number): Promise<string | null> {
    const headers: Record<string, string> = {accept: 'application/json'};
    if (!this.apiKey && this.readToken) headers.authorization = `Bearer ${this.readToken}`;
    const res = await this.fetchFn(searchUrl(title, year, this.apiKey), {headers, signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`TMDB answered ${res.status}`);
    const path = firstPosterPath(await res.json());
    return path ? tmdbImageUrl(path) : null;
  }
}

/** `TMDB_API_KEY` (v3) or `TMDB_READ_TOKEN` (v4). No key means no lookup. */
export function createPosterLookup(env: NodeJS.ProcessEnv = process.env): TmdbPosters | null {
  const apiKey = env.TMDB_API_KEY?.trim();
  const readToken = env.TMDB_READ_TOKEN?.trim();
  if (!apiKey && !readToken) return null;
  return new TmdbPosters({
    ...(apiKey ? {apiKey} : {}),
    ...(readToken ? {readToken} : {}),
    log: msg => console.warn(`[posters] ${msg}`),
  });
}

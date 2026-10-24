import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import type {TonightPick} from '@huddle/shared';
import {MockAI} from '../src/ai/index.js';
import {createPosterLookup, firstPosterPath, isPosterPath, tmdbImageUrl, TmdbPosters} from '../src/posters/tmdb.js';
import {claimTv, startServer} from './helpers.js';

const PICK = (title: string, year?: number): TonightPick => ({title, why: 'because', ...(year ? {year} : {})});

interface Call {
  url: string;
  authorization?: string;
}

function fakeFetch(handler: (url: string) => {ok: boolean; status: number; body: unknown} | 'throw') {
  const calls: Call[] = [];
  const fetchFn = async (url: string, init?: {headers?: Record<string, string>}) => {
    calls.push({url, ...(init?.headers?.authorization ? {authorization: init.headers.authorization} : {})});
    const result = handler(url);
    if (result === 'throw') throw new Error('network down');
    return {ok: result.ok, status: result.status, json: async () => result.body};
  };
  return {fetchFn, calls};
}

function movie(path: string | null) {
  return {results: [{id: 1, title: 'Paddington 2', poster_path: path}]};
}

describe('TMDB posters', () => {
  it('builds a w342 image URL and rejects a path that is not a file', () => {
    assert.equal(tmdbImageUrl('/abc.jpg'), 'https://image.tmdb.org/t/p/w342/abc.jpg');
    assert.equal(tmdbImageUrl('abc.jpg'), 'https://image.tmdb.org/t/p/w342/abc.jpg');
    assert.equal(isPosterPath('/abc.jpg'), true);
    assert.equal(isPosterPath('https://evil.example/x.jpg'), false);
    assert.equal(isPosterPath('/a/../../etc/passwd'), false);
    assert.equal(firstPosterPath({results: [{poster_path: null}, {poster_path: '/ok.jpg'}]}), '/ok.jpg');
    assert.equal(firstPosterPath({results: []}), null);
  });

  it('stays off without a key', () => {
    assert.equal(createPosterLookup({}), null);
    assert.equal(createPosterLookup({TMDB_API_KEY: '  ', TMDB_READ_TOKEN: ''}), null);
  });

  it('sends a v3 key as api_key and caches the poster', async () => {
    const {fetchFn, calls} = fakeFetch(() => ({ok: true, status: 200, body: movie('/p2.jpg')}));
    const posters = new TmdbPosters({apiKey: 'v3-secret', fetchFn});
    const once = await posters.attach([PICK('Paddington 2', 2017), PICK('  ')]);
    assert.equal(once[0]!.posterUrl, 'https://image.tmdb.org/t/p/w342/p2.jpg');
    assert.equal(once[1]!.posterUrl, undefined);
    assert.equal(calls.length, 1);
    const url = new URL(calls[0]!.url);
    assert.equal(url.origin + url.pathname, 'https://api.themoviedb.org/3/search/movie');
    assert.equal(url.searchParams.get('api_key'), 'v3-secret');
    assert.equal(url.searchParams.get('query'), 'Paddington 2');
    assert.equal(url.searchParams.get('year'), '2017');
    assert.equal(url.searchParams.get('include_adult'), 'false');
    assert.equal(calls[0]!.authorization, undefined);
    assert.equal(once[0]!.posterUrl!.includes('v3-secret'), false);

    const twice = await posters.attach([PICK('Paddington 2', 2017)]);
    assert.equal(twice[0]!.posterUrl, once[0]!.posterUrl);
    assert.equal(calls.length, 1);
  });

  it('sends a v4 read token as a bearer and does not put it in the URL', async () => {
    const {fetchFn, calls} = fakeFetch(() => ({ok: true, status: 200, body: movie('/tok.jpg')}));
    const posters = new TmdbPosters({readToken: 'v4-secret', fetchFn});
    const [pick] = await posters.attach([PICK('Up')]);
    assert.equal(pick!.posterUrl, 'https://image.tmdb.org/t/p/w342/tok.jpg');
    assert.equal(calls[0]!.authorization, 'Bearer v4-secret');
    assert.equal(new URL(calls[0]!.url).searchParams.get('api_key'), null);
    assert.equal(calls[0]!.url.includes('v4-secret'), false);
  });

  it('prefers the v3 key when both are set', async () => {
    const {fetchFn, calls} = fakeFetch(() => ({ok: true, status: 200, body: movie('/both.jpg')}));
    const posters = new TmdbPosters({apiKey: 'v3', readToken: 'v4', fetchFn});
    await posters.attach([PICK('Up')]);
    assert.equal(new URL(calls[0]!.url).searchParams.get('api_key'), 'v3');
    assert.equal(calls[0]!.authorization, undefined);
  });

  it('retries without the year when that search has no poster', async () => {
    const {fetchFn, calls} = fakeFetch(url => {
      const year = new URL(url).searchParams.get('year');
      return {ok: true, status: 200, body: year ? {results: []} : movie('/broad.jpg')};
    });
    const posters = new TmdbPosters({apiKey: 'k', fetchFn});
    const [pick] = await posters.attach([PICK('Knives Out', 2019)]);
    assert.equal(pick!.posterUrl, 'https://image.tmdb.org/t/p/w342/broad.jpg');
    assert.equal(calls.length, 2);
    assert.equal(new URL(calls[1]!.url).searchParams.get('year'), null);

    await posters.attach([PICK('Knives Out', 2019), PICK('Knives Out')]);
    assert.equal(calls.length, 2);
  });

  it('leaves the pick alone when TMDB fails or has no artwork', async () => {
    const down = fakeFetch(() => 'throw');
    const broken = new TmdbPosters({apiKey: 'k', fetchFn: down.fetchFn, log: () => {}});
    const [missed] = await broken.attach([PICK('Apollo 13', 1995)]);
    assert.equal(missed!.posterUrl, undefined);
    assert.equal(down.calls.length, 1);
    await broken.attach([PICK('Apollo 13', 1995)]);
    assert.equal(down.calls.length, 2, 'a network error is not cached');

    const empty = fakeFetch(() => ({ok: false, status: 401, body: {}}));
    const denied = new TmdbPosters({apiKey: 'k', fetchFn: empty.fetchFn, log: () => {}});
    const [deniedPick] = await denied.attach([PICK('Up')]);
    assert.equal(deniedPick!.posterUrl, undefined);

    const none = fakeFetch(() => ({ok: true, status: 200, body: movie(null)}));
    const blank = new TmdbPosters({apiKey: 'k', fetchFn: none.fetchFn});
    const [blankPick] = await blank.attach([PICK('Ted Lasso')]);
    assert.equal(blankPick!.posterUrl, undefined);
    await blank.attach([PICK('Ted Lasso')]);
    assert.equal(none.calls.length, 1, 'a miss is cached');
  });
});

describe('hub posters', () => {
  it('adds posters to mock picks and still returns picks when the lookup throws', async () => {
    const server = await startServer({
      ai: new MockAI({delayMs: 0}),
      posters: {
        async attach(picks) {
          return picks.map(p => ({...p, posterUrl: `https://image.tmdb.org/t/p/w342/${encodeURIComponent(p.title)}.jpg`}));
        },
      },
    });
    try {
      const {tv} = await claimTv(server.url, 'posters-ok');
      tv.send('tonight:request', {mood: 'cozy'});
      const ok = await tv.nextOf('tonight:picks');
      assert.equal(ok.payload.source, 'mock');
      assert.equal(ok.payload.picks.length, 3);
      assert.ok(ok.payload.picks.every((p: TonightPick) => p.posterUrl?.startsWith('https://image.tmdb.org/t/p/w342/')));
      tv.close();
    } finally {
      await server.close();
    }

    const failing = await startServer({
      ai: new MockAI({delayMs: 0}),
      posters: {
        async attach() {
          throw new Error('tmdb down');
        },
      },
    });
    try {
      const {tv} = await claimTv(failing.url, 'posters-down');
      tv.send('tonight:request', {mood: 'funny'});
      const picks = await tv.nextOf('tonight:picks');
      assert.equal(picks.payload.source, 'mock');
      assert.equal(picks.payload.picks[0].posterUrl, undefined);
      assert.ok(picks.payload.picks[0].title);
      tv.close();
    } finally {
      await failing.close();
    }
  });
});

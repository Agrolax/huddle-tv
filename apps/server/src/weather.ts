import type {Weather} from '@huddle/shared';

export interface WeatherPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export const DEFAULT_PLACE: WeatherPlace = {name: 'Toronto', latitude: 43.65, longitude: -79.38};

type FetchLike = (url: string, init?: {signal?: AbortSignal}) => Promise<{ok: boolean; status: number; json(): Promise<unknown>}>;

export function openMeteoUrl(place: WeatherPlace): string {
  const q = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    timezone: 'auto',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** Turn an Open-Meteo forecast response into our `Weather`. Throws on a shape we don't expect. */
export function parseOpenMeteo(body: unknown, place: WeatherPlace, now: number): Weather {
  const b = body as {current?: {temperature_2m?: unknown; weather_code?: unknown}; daily?: {temperature_2m_max?: unknown[]; temperature_2m_min?: unknown[]}};
  const temp = b?.current?.temperature_2m;
  const code = b?.current?.weather_code;
  if (typeof temp !== 'number' || typeof code !== 'number') throw new Error('Open-Meteo response is missing current conditions');
  const high = b.daily?.temperature_2m_max?.[0];
  const low = b.daily?.temperature_2m_min?.[0];
  return {
    place: place.name,
    tempC: Math.round(temp),
    code,
    ...(typeof high === 'number' ? {highC: Math.round(high)} : {}),
    ...(typeof low === 'number' ? {lowC: Math.round(low)} : {}),
    updatedAt: new Date(now).toISOString(),
  };
}

export async function fetchWeather(place: WeatherPlace, fetchFn: FetchLike = fetch as unknown as FetchLike, now = Date.now()): Promise<Weather> {
  const res = await fetchFn(openMeteoUrl(place), {signal: AbortSignal.timeout(8000)});
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
  return parseOpenMeteo(await res.json(), place, now);
}

/** Fetch now and every `everyMs`; failures keep the last good reading. Returns a stop function. */
export function pollWeather(
  place: WeatherPlace,
  onWeather: (w: Weather) => void,
  opts: {everyMs?: number; fetchFn?: FetchLike; log?: (msg: string) => void} = {},
): () => void {
  const tick = () =>
    fetchWeather(place, opts.fetchFn)
      .then(onWeather)
      .catch(e => opts.log?.(`weather fetch failed: ${(e as Error).message}`));
  tick();
  const t = setInterval(tick, opts.everyMs ?? 15 * 60_000);
  return () => clearInterval(t);
}

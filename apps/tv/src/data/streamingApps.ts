export type StreamingApp = {
  id: string;
  name: string;
  /** URI tried first (title or app deep link). */
  uri: string;
  /** Fallback if the primary URI cannot open. */
  fallbackUri?: string;
  color: string;
};

/** Household services for phase 1. Phone companion will own this list later. */
export const STREAMING_APPS: StreamingApp[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    uri: 'https://www.netflix.com',
    fallbackUri: 'amzns://apps?asin=B00132OX86',
    color: '#E50914',
  },
  {
    id: 'prime',
    name: 'Prime Video',
    uri: 'https://watch.amazon.com',
    fallbackUri: 'amzns://apps?asin=B00ODGPDYQ',
    color: '#00A8E1',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    uri: 'https://www.youtube.com/tv',
    fallbackUri: 'amzns://apps?asin=B00P93ZFVN',
    color: '#FF0000',
  },
  {
    id: 'disney',
    name: 'Disney+',
    uri: 'https://www.disneyplus.com',
    fallbackUri: 'amzns://apps?asin=B07YTM4WW4',
    color: '#113CCF',
  },
];

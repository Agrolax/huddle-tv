/**
 * Blob avatars: a flat cartoon body in the person's color with two eyes and a
 * smile. The TV (react-native-svg) and the phone (inline SVG) draw the same
 * shapes from this table, in a 100×100 view box.
 */
import type {Profile} from './protocol';

export const BLOB_KINDS = ['bean', 'drop', 'cloud', 'squish'] as const;
export type BlobKind = (typeof BLOB_KINDS)[number];

export interface BlobShape {
  body: string;
  /** Eye centers. */
  eyes: [number, number][];
  /** Smile, stroked. */
  mouth: string;
}

export const BLOBS: Record<BlobKind, BlobShape> = {
  bean: {
    body: 'M50 8 C78 8 92 30 92 56 C92 82 74 94 50 94 C26 94 8 82 8 56 C8 30 22 8 50 8 Z',
    eyes: [
      [37, 50],
      [63, 50],
    ],
    mouth: 'M42 66 Q50 74 58 66',
  },
  drop: {
    body: 'M50 4 C62 24 90 40 90 64 C90 84 72 95 50 95 C28 95 10 84 10 64 C10 40 38 24 50 4 Z',
    eyes: [
      [38, 60],
      [62, 60],
    ],
    mouth: 'M44 75 Q50 81 56 75',
  },
  cloud: {
    body: 'M18 44 C16 26 34 14 48 22 C60 8 84 16 84 36 C96 44 96 66 86 74 C82 90 64 94 50 94 C34 94 14 90 12 74 C2 64 6 48 18 44 Z',
    eyes: [
      [38, 54],
      [62, 54],
    ],
    mouth: 'M42 70 Q50 77 58 70',
  },
  squish: {
    body: 'M50 22 C80 22 97 40 97 62 C97 84 78 93 50 93 C22 93 3 84 3 62 C3 40 20 22 50 22 Z',
    eyes: [
      [36, 56],
      [64, 56],
    ],
    mouth: 'M40 72 Q50 81 60 72',
  },
};

export const BLOB_EYE_RADIUS = 9;
export const BLOB_PUPIL_RADIUS = 4.5;
export const BLOB_INK = '#1B1D21';

/** Colors a phone can pick for a person. Bright enough to read on the dark TV. */
export const AVATAR_COLORS = ['#3D8BFF', '#F5A524', '#3DCF8E', '#B57BFF', '#FF6B8B', '#22C3D6', '#9AA3B2'] as const;

export function isBlobKind(v: unknown): v is BlobKind {
  return typeof v === 'string' && (BLOB_KINDS as readonly string[]).includes(v);
}

/** The person's blob, or a steady pick from their id for older profiles without one. */
export function blobFor(profile: Pick<Profile, 'id' | 'avatar'>): BlobShape {
  if (isBlobKind(profile.avatar)) return BLOBS[profile.avatar];
  let h = 0;
  for (const ch of profile.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BLOBS[BLOB_KINDS[h % BLOB_KINDS.length]!];
}

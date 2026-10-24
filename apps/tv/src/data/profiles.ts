import type {Profile} from '@huddle/shared';

/** Offline fallback; the server's household replaces it on connect. */
export const PROFILES: Profile[] = [
  {id: 'maya', name: 'Maya', color: '#3D8BFF', avatar: 'bean'},
  {id: 'leo', name: 'Leo', color: '#F5A524', avatar: 'drop', kid: true},
  {id: 'guest', name: 'Guest', color: '#9AA3B2', avatar: 'cloud'},
];

export function namesFor(ids: string[], profiles: Profile[] = PROFILES): string {
  const names = profiles.filter(p => ids.includes(p.id)).map(p => p.name);
  if (names.length <= 1) return names[0] ?? 'everyone';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

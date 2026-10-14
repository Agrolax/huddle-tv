import type {Profile} from '@huddle/shared';

/** Offline fallback; the server's household replaces it on connect. */
export const PROFILES: Profile[] = [
  {id: 'rafi', name: 'Rafi', color: '#3D8BFF'},
  {id: 'nanu', name: 'Nanu', color: '#F5A524'},
  {id: 'ammu', name: 'Ammu', color: '#3DCF8E'},
  {id: 'abbu', name: 'Abbu', color: '#B57BFF'},
  {id: 'guest', name: 'Guest', color: '#9AA3B2'},
];

export function namesFor(ids: string[], profiles: Profile[] = PROFILES): string {
  const names = profiles.filter(p => ids.includes(p.id)).map(p => p.name);
  if (names.length <= 1) return names[0] ?? 'everyone';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

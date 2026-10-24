import {EMPTY_CANVAS, IDLE_GAME, IDLE_VOTE} from '@huddle/shared';
import type {CalendarEvent, HouseholdSnapshot, Profile, Weather} from '@huddle/shared';

/** Two people and a guest. Phones add more (`profile:save`). */
export const DEMO_PEOPLE: Profile[] = [
  {id: 'maya', name: 'Maya', color: '#3D8BFF', avatar: 'bean'},
  {id: 'leo', name: 'Leo', color: '#F5A524', avatar: 'drop', kid: true},
  {id: 'guest', name: 'Guest', color: '#9AA3B2', avatar: 'cloud'},
];

/** In-memory demo household. A server restart clears it. */
export function demoHousehold(
  householdId: string,
  now = Date.now(),
  weather: Weather | null = null,
  people: Profile[] = DEMO_PEOPLE,
): HouseholdSnapshot {
  return {
    householdId,
    name: 'The Parks',
    profiles: people.map(p => ({...p})),
    activeProfileIds: people.filter(p => p.id !== 'guest').slice(0, 2).map(p => p.id),
    events: demoEvents(now),
    messages: [],
    devices: [
      {id: 'living-lamp', name: 'Lamp', room: 'Living room', kind: 'light', on: true, level: 70},
      {id: 'thermostat', name: 'Thermostat', room: 'Hall', kind: 'thermostat', level: 21},
      {id: 'front-door', name: 'Front door', room: 'Entry', kind: 'lock', on: true},
    ],
    weather,
    tonight: null,
    vote: IDLE_VOTE,
    sketch: EMPTY_CANVAS,
    game: IDLE_GAME,
    league: {},
    clients: [],
  };
}

/**
 * A week of events placed relative to `now` (server local time, so set TZ on a hosted box),
 * so the calendar never opens empty or in the past on demo day.
 */
export function demoEvents(now: number): CalendarEvent[] {
  const day = new Date(now);
  const at = (addDays: number, hour: number) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate() + addDays, hour).toISOString();
  const daysToSaturday = ((6 - day.getDay() + 7) % 7) || 7;
  return [
    {id: 'demo-pizza', title: 'Pizza night', start: at(0, 19), end: at(0, 21), profileIds: []},
    {id: 'demo-dentist', title: 'Dentist', start: at(1, 16), profileIds: ['maya']},
    {id: 'demo-soccer', title: 'Soccer practice', start: at(daysToSaturday, 10), profileIds: ['leo']},
    {id: 'demo-grandma', title: 'Grandma visits', start: at(2, 13), end: at(2, 17), profileIds: []},
    {id: 'demo-piano', title: 'Piano lesson', start: at(3, 17), profileIds: ['leo']},
    {id: 'demo-book', title: 'Book club', start: at(4, 19), profileIds: ['maya']},
    {id: 'demo-swim', title: 'Swim class', start: at(5, 16), profileIds: ['leo']},
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

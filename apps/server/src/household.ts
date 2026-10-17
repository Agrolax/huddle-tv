import {IDLE_GAME} from '@huddle/shared';
import type {CalendarEvent, HouseholdSnapshot, Weather} from '@huddle/shared';

/** In-memory demo household. DynamoDB replaces this in a later step. */
export function demoHousehold(householdId: string, now = Date.now(), weather: Weather | null = null): HouseholdSnapshot {
  return {
    householdId,
    name: 'The Khans',
    profiles: [
      {id: 'rafi', name: 'Rafi', color: '#3D8BFF'},
      {id: 'nanu', name: 'Nanu', color: '#F5A524'},
      {id: 'ammu', name: 'Ammu', color: '#3DCF8E'},
      {id: 'abbu', name: 'Abbu', color: '#B57BFF'},
      {id: 'guest', name: 'Guest', color: '#9AA3B2'},
    ],
    activeProfileIds: ['rafi', 'nanu'],
    events: demoEvents(now),
    messages: [],
    devices: [
      {id: 'living-lamp', name: 'Lamp', room: 'Living room', kind: 'light', on: true, level: 70},
      {id: 'thermostat', name: 'Thermostat', room: 'Hall', kind: 'thermostat', level: 21},
      {id: 'front-door', name: 'Front door', room: 'Entry', kind: 'lock', on: true},
    ],
    weather,
    tonight: null,
    sketch: {roundId: null, phase: 'idle', scores: {}},
    game: IDLE_GAME,
    league: {},
    clients: [],
  };
}

/**
 * Three events placed relative to `now` (server local time, so set TZ on a hosted box),
 * so the calendar never opens empty or in the past on demo day.
 */
export function demoEvents(now: number): CalendarEvent[] {
  const day = new Date(now);
  const at = (addDays: number, hour: number) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate() + addDays, hour).toISOString();
  const daysToSaturday = ((6 - day.getDay() + 7) % 7) || 7;
  return [
    {id: 'demo-pizza', title: 'Pizza night', start: at(0, 19), end: at(0, 21), profileIds: []},
    {id: 'demo-dentist', title: 'Dentist', start: at(1, 16), profileIds: ['ammu']},
    {id: 'demo-soccer', title: 'Soccer practice', start: at(daysToSaturday, 10), profileIds: ['rafi']},
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

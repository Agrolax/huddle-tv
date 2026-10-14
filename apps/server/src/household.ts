import type {HouseholdSnapshot} from '@huddle/shared';

/** In-memory demo household. DynamoDB replaces this in a later step. */
export function demoHousehold(householdId: string): HouseholdSnapshot {
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
    events: [],
    messages: [],
    devices: [
      {id: 'living-lamp', name: 'Lamp', room: 'Living room', kind: 'light', on: true, level: 70},
      {id: 'thermostat', name: 'Thermostat', room: 'Hall', kind: 'thermostat', level: 21},
      {id: 'front-door', name: 'Front door', room: 'Entry', kind: 'lock', on: true},
    ],
    sketch: {roundId: null, phase: 'idle', scores: {}},
    clients: [],
  };
}

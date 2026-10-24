import {applyDeviceSet, deviceStateLabel, eventWhen, pruneEvents, tonightEvents, upcomingEvents, weatherSummary, weekDays} from '../src/widgets';
import {validateCalendarAdd, validateCalendarRemove, validateSmartHomeSet} from '../src/validate';
import type {CalendarEvent, SmartDevice} from '../src/protocol';

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const ev = (id: string, start: Date, end?: Date): CalendarEvent => ({
  id,
  title: id,
  start: start.toISOString(),
  ...(end ? {end: end.toISOString()} : {}),
  profileIds: [],
});

describe('weatherSummary', () => {
  it.each([
    [0, 'Clear'],
    [2, 'Partly cloudy'],
    [3, 'Cloudy'],
    [45, 'Fog'],
    [53, 'Drizzle'],
    [63, 'Rain'],
    [81, 'Rain'],
    [73, 'Snow'],
    [95, 'Thunderstorm'],
  ])('%i → %s', (code, word) => expect(weatherSummary(code)).toBe(word));
});

describe('calendar helpers', () => {
  const now = at(2026, 10, 15, 12); // Thu Oct 15, noon

  it('upcomingEvents drops ended events and sorts by start', () => {
    const events = [
      ev('later', at(2026, 10, 17, 10)),
      ev('ended', at(2026, 10, 15, 9)),
      ev('running', at(2026, 10, 15, 11, 30)), // default 1h, still on
      ev('soon', at(2026, 10, 15, 16)),
    ];
    expect(upcomingEvents(events, now).map(e => e.id)).toEqual(['running', 'soon', 'later']);
    expect(upcomingEvents(events, now, 2).map(e => e.id)).toEqual(['running', 'soon']);
  });

  it('pruneEvents keeps a day of history', () => {
    const events = [ev('old', at(2026, 10, 13, 9)), ev('yesterday', at(2026, 10, 14, 18))];
    expect(pruneEvents(events, now.getTime()).map(e => e.id)).toEqual(['yesterday']);
  });

  it('eventWhen says time today, Tomorrow, weekday, then date', () => {
    expect(eventWhen(at(2026, 10, 15, 16).toISOString(), now)).toBe('4:00');
    expect(eventWhen(at(2026, 10, 16, 9).toISOString(), now)).toBe('Tomorrow');
    expect(eventWhen(at(2026, 10, 17, 10).toISOString(), now)).toBe('Sat');
    expect(eventWhen(at(2026, 10, 30, 10).toISOString(), now)).toBe('Oct 30');
  });
});

describe('smart home', () => {
  const lamp: SmartDevice = {id: 'lamp', name: 'Lamp', room: 'Living', kind: 'light', on: true, level: 70};
  const thermo: SmartDevice = {id: 't', name: 'Thermostat', room: 'Hall', kind: 'thermostat', level: 21};
  const lock: SmartDevice = {id: 'door', name: 'Front door', room: 'Entry', kind: 'lock', on: true};

  it('toggles and clamps', () => {
    expect(applyDeviceSet(lamp, {on: false}).on).toBe(false);
    expect(applyDeviceSet(lamp, {level: 140}).level).toBe(100);
    expect(applyDeviceSet(thermo, {level: 40}).level).toBe(28);
    expect(applyDeviceSet(thermo, {level: 21.3}).level).toBe(21.5);
    expect(applyDeviceSet(thermo, {on: false}).on).toBeUndefined();
  });

  it('labels state', () => {
    expect(deviceStateLabel(lamp)).toBe('On');
    expect(deviceStateLabel(thermo)).toBe('21°');
    expect(deviceStateLabel(lock)).toBe('Locked');
    expect(deviceStateLabel({...lock, on: false})).toBe('Unlocked');
  });
});

describe('widget validators', () => {
  it('calendar:add trims, normalises dates and dedupes people', () => {
    const r = validateCalendarAdd({title: '  Dentist ', start: '2026-10-16T16:00:00-04:00', profileIds: ['maya', 'maya']});
    expect(r).toEqual({ok: true, value: {title: 'Dentist', start: '2026-10-16T20:00:00.000Z', profileIds: ['maya']}});
  });

  it('calendar:add defaults profileIds to everyone', () => {
    const r = validateCalendarAdd({title: 'Pizza', start: '2026-10-16T19:00:00Z'});
    expect(r.ok && r.value.profileIds).toEqual([]);
  });

  it.each([
    [{title: '', start: '2026-10-16T19:00:00Z'}],
    [{title: 'x'.repeat(81), start: '2026-10-16T19:00:00Z'}],
    [{title: 'Pizza', start: 'tomorrow'}],
    [{title: 'Pizza', start: '2026-10-16T19:00:00Z', end: '2026-10-16T18:00:00Z'}],
    [{title: 'Pizza', start: '2026-10-16T19:00:00Z', profileIds: ['bad id']}],
  ])('calendar:add rejects %j', payload => expect(validateCalendarAdd(payload).ok).toBe(false));

  it('calendar:remove needs an id', () => {
    expect(validateCalendarRemove({eventId: 'abc-1'}).ok).toBe(true);
    expect(validateCalendarRemove({}).ok).toBe(false);
  });

  it('smart-home:set needs a device and a change', () => {
    expect(validateSmartHomeSet({deviceId: 'lamp', on: false})).toEqual({ok: true, value: {deviceId: 'lamp', on: false}});
    expect(validateSmartHomeSet({deviceId: 'lamp'}).ok).toBe(false);
    expect(validateSmartHomeSet({deviceId: 'lamp', on: 'yes'}).ok).toBe(false);
    expect(validateSmartHomeSet({deviceId: 'lamp', level: Infinity}).ok).toBe(false);
  });
});

describe('week view', () => {
  const now = at(2026, 10, 22, 18, 0); // Thursday evening
  const events = [
    ev('later-today', at(2026, 10, 22, 19)),
    ev('morning', at(2026, 10, 22, 8)),
    ev('sat', at(2026, 10, 24, 10)),
    ev('next-week', at(2026, 10, 29, 10)),
  ];

  it('lays out today and six more days, each with its own events in order', () => {
    const days = weekDays(events, now);
    expect(days.map(d => `${d.name} ${d.date}`)).toEqual(['Thu 22', 'Fri 23', 'Sat 24', 'Sun 25', 'Mon 26', 'Tue 27', 'Wed 28']);
    expect(days[0]!.today).toBe(true);
    expect(days[0]!.events.map(e => e.id)).toEqual(['morning', 'later-today']);
    expect(days[2]!.events.map(e => e.id)).toEqual(['sat']);
    expect(days.flatMap(d => d.events).some(e => e.id === 'next-week')).toBe(false);
  });

  it('tonight is what is still on this evening', () => {
    expect(tonightEvents(events, now).map(e => e.id)).toEqual(['later-today']);
    expect(tonightEvents(events, at(2026, 10, 22, 7)).map(e => e.id)).toEqual(['later-today']);
  });
});

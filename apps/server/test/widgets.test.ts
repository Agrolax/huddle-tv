import {after, before, beforeEach, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import type {Weather} from '@huddle/shared';
import {demoEvents} from '../src/household.js';
import {DEFAULT_PLACE, fetchWeather, openMeteoUrl, parseOpenMeteo} from '../src/weather.js';
import {TestServer, claimTv, pairPhone, startServer} from './helpers.js';

let server: TestServer;
let n = 0;
let hh: string;

before(async () => {
  server = await startServer();
});
after(async () => {
  await server.close();
});
beforeEach(() => {
  hh = `widgets${++n}`;
});

async function tvAndPhone() {
  const {tv, pair} = await claimTv(server.url, hh);
  const {phone, welcome} = await pairPhone(server.url, pair.code, {}, hh);
  return {tv, phone, welcome};
}

describe('calendar', () => {
  it('a new household has three demo events', async () => {
    const {tv, phone, welcome} = await tvAndPhone();
    const events = welcome.payload.snapshot.events;
    assert.deepEqual(events.map((e: any) => e.title), ['Pizza night', 'Dentist', 'Soccer practice']);
    tv.close();
    phone.close();
  });

  it('demo events land today, tomorrow and on a Saturday', () => {
    const thu = new Date(2026, 9, 15, 12).getTime();
    const [pizza, dentist, soccer] = demoEvents(thu);
    assert.equal(new Date(pizza!.start).getDate(), 15);
    assert.equal(new Date(dentist!.start).getDate(), 16);
    assert.equal(new Date(soccer!.start).getDay(), 6);
  });

  it('a phone adds an event; the TV gets the sorted list', async () => {
    const {tv, phone} = await tvAndPhone();
    const start = new Date(server.clock.now + 30 * 60_000).toISOString();
    const id = phone.send('calendar:add', {title: ' Movie ', start, profileIds: ['rafi']});
    const update = await tv.nextOf('calendar:updated');
    const added = update.payload.events.find((e: any) => e.id === id);
    assert.deepEqual(added, {id, title: 'Movie', start, profileIds: ['rafi']});
    const starts = update.payload.events.map((e: any) => Date.parse(e.start));
    assert.deepEqual(starts, [...starts].sort((a: number, b: number) => a - b), 'soonest first');
    assert.equal(server.hub.household(hh)!.events.length, 4);
    tv.close();
    phone.close();
  });

  it('rejects unknown people and bad dates', async () => {
    const {tv, phone} = await tvAndPhone();
    phone.send('calendar:add', {title: 'x', start: new Date().toISOString(), profileIds: ['nobody']});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    phone.send('calendar:add', {title: 'x', start: 'soon'});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    assert.ok(await tv.noneOf('calendar:updated'));
    tv.close();
    phone.close();
  });

  it('removes an event', async () => {
    const {tv, phone} = await tvAndPhone();
    phone.send('calendar:remove', {eventId: 'demo-dentist'});
    const update = await tv.nextOf('calendar:updated');
    assert.ok(!update.payload.events.some((e: any) => e.id === 'demo-dentist'));
    phone.send('calendar:remove', {eventId: 'demo-dentist'});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    tv.close();
    phone.close();
  });

  it('the TV may not edit the calendar', async () => {
    const {tv, phone} = await tvAndPhone();
    tv.send('calendar:add', {title: 'x', start: new Date().toISOString()});
    assert.equal((await tv.nextOf('error')).payload.code, 'forbidden');
    tv.close();
    phone.close();
  });
});

describe('smart home', () => {
  it('a phone turns the lamp off; everyone gets the new state', async () => {
    const {tv, phone} = await tvAndPhone();
    phone.send('smart-home:set', {deviceId: 'living-lamp', on: false});
    const [onTv, onPhone] = await Promise.all([tv.nextOf('smart-home:state'), phone.nextOf('smart-home:state')]);
    assert.equal(onTv.payload.devices.find((d: any) => d.id === 'living-lamp').on, false);
    assert.deepEqual(onPhone.payload, onTv.payload);
    tv.close();
    phone.close();
  });

  it('the TV can set the thermostat, clamped to range', async () => {
    const {tv, phone} = await tvAndPhone();
    tv.send('smart-home:set', {deviceId: 'thermostat', level: 99});
    const state = await phone.nextOf('smart-home:state');
    assert.equal(state.payload.devices.find((d: any) => d.id === 'thermostat').level, 28);
    tv.close();
    phone.close();
  });

  it('unknown device is a bad request', async () => {
    const {tv, phone} = await tvAndPhone();
    phone.send('smart-home:set', {deviceId: 'garage', on: true});
    assert.equal((await phone.nextOf('error')).payload.code, 'bad-request');
    tv.close();
    phone.close();
  });
});

describe('weather', () => {
  const reading: Weather = {place: 'Toronto', tempC: 12, code: 3, highC: 14, lowC: 6, updatedAt: '2026-10-15T12:00:00.000Z'};

  it('pushes new weather to live households and seeds new ones', async () => {
    const {tv, phone} = await tvAndPhone();
    server.hub.setWeather(reading);
    assert.deepEqual((await tv.nextOf('weather:updated')).payload, reading);
    assert.deepEqual((await phone.nextOf('weather:updated')).payload, reading);
    const fresh = await claimTv(server.url, `${hh}-b`);
    assert.deepEqual(server.hub.household(`${hh}-b`)!.weather, reading);
    tv.close();
    phone.close();
    fresh.tv.close();
  });

  it('parses an Open-Meteo response', () => {
    const body = {current: {temperature_2m: 11.6, weather_code: 61}, daily: {temperature_2m_max: [13.4], temperature_2m_min: [5.5]}};
    assert.deepEqual(parseOpenMeteo(body, DEFAULT_PLACE, Date.parse('2026-10-15T12:00:00Z')), {
      place: 'Toronto',
      tempC: 12,
      code: 61,
      highC: 13,
      lowC: 6,
      updatedAt: '2026-10-15T12:00:00.000Z',
    });
    assert.throws(() => parseOpenMeteo({}, DEFAULT_PLACE, 0));
  });

  it('builds the request URL and surfaces HTTP errors', async () => {
    assert.match(openMeteoUrl(DEFAULT_PLACE), /latitude=43\.65.*longitude=-79\.38.*current=temperature_2m%2Cweather_code/);
    const failing = async () => ({ok: false, status: 503, json: async () => ({})});
    await assert.rejects(fetchWeather(DEFAULT_PLACE, failing), /503/);
  });
});

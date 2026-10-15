import type {SocketLike} from '@huddle/shared';
import {PROTOCOL_VERSION} from '@huddle/shared';

const PROFILES = [
  {id: 'rafi', name: 'Rafi', color: '#3D8BFF'},
  {id: 'nanu', name: 'Nanu', color: '#F5A524'},
  {id: 'ammu', name: 'Ammu', color: '#3DCF8E'},
  {id: 'abbu', name: 'Abbu', color: '#B57BFF'},
  {id: 'guest', name: 'Guest', color: '#9AA3B2'},
];

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export const DEVICES = [
  {id: 'living-lamp', name: 'Lamp', room: 'Living room', kind: 'light', on: true, level: 70},
  {id: 'thermostat', name: 'Thermostat', room: 'Hall', kind: 'thermostat', level: 21},
  {id: 'front-door', name: 'Front door', room: 'Entry', kind: 'lock', on: true},
];

export const WEATHER = {place: 'Toronto', tempC: 12, code: 3, highC: 14, lowC: 6, updatedAt: new Date().toISOString()};

/** In-process stand-in for apps/server: answers hello and pair:request, records what the TV sends. */
export class FakeServer {
  sockets: FakeSocket[] = [];
  received: Array<{type: string; payload: any}> = [];
  online = true;
  devices: any[] = DEVICES.map(d => ({...d}));
  weather: any = WEATHER;

  createSocket = (url: string): SocketLike => {
    const s = new FakeSocket(url, this);
    this.sockets.push(s);
    // Open (or fail) on the next tick, like a real socket.
    setTimeout(() => (this.online ? s.open() : s.drop()), 0);
    return s;
  };

  get tv(): FakeSocket {
    return this.sockets[this.sockets.length - 1]!;
  }

  push(type: string, payload: unknown): void {
    this.tv.deliver(type, payload);
  }

  handle(socket: FakeSocket, type: string, payload: any): void {
    this.received.push({type, payload});
    if (type === 'hello') {
      socket.deliver('welcome', {
        snapshot: {
          householdId: 'home',
          name: 'The Khans',
          profiles: PROFILES,
          activeProfileIds: ['rafi', 'nanu'],
          events: [
            {id: 'e-movie', title: 'Movie night', start: hoursFromNow(0.5), profileIds: []},
            {id: 'e-dentist', title: 'Dentist', start: hoursFromNow(30), profileIds: ['ammu']},
            {id: 'e-past', title: 'Breakfast', start: hoursFromNow(-5), profileIds: []},
          ],
          messages: [],
          devices: this.devices,
          weather: this.weather,
          sketch: {roundId: null, phase: 'idle', scores: {}},
          clients: [payload.client],
        },
        you: payload.client,
        token: 'tv-token',
      });
    } else if (type === 'smart-home:set') {
      this.devices = this.devices.map(d =>
        d.id === payload.deviceId
          ? {...d, ...(payload.on !== undefined ? {on: payload.on} : {}), ...(payload.level !== undefined ? {level: payload.level} : {})}
          : d,
      );
      socket.deliver('smart-home:state', {devices: this.devices});
    } else if (type === 'pair:request') {
      socket.deliver('pair:code', {code: 'H7K2QP', expiresAt: Date.now() + 600_000, joinUrl: 'http://10.0.0.5:5173/?h=home&c=H7K2QP'});
    }
  }
}

export class FakeSocket implements SocketLike {
  readyState = 0;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: {data: unknown}) => void) | null = null;
  constructor(public url: string, private server: FakeServer) {}
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({});
  }
  send(data: string) {
    const {type, payload} = JSON.parse(data);
    this.server.handle(this, type, payload);
  }
  close() {
    this.readyState = 3;
  }
  deliver(type: string, payload: unknown) {
    this.onmessage?.({data: JSON.stringify({v: PROTOCOL_VERSION, id: Math.random().toString(36).slice(2), ts: Date.now(), type, payload})});
  }
}

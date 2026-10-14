import type {SocketLike} from '@huddle/shared';
import {PROTOCOL_VERSION} from '@huddle/shared';

const PROFILES = [
  {id: 'rafi', name: 'Rafi', color: '#3D8BFF'},
  {id: 'nanu', name: 'Nanu', color: '#F5A524'},
  {id: 'ammu', name: 'Ammu', color: '#3DCF8E'},
  {id: 'abbu', name: 'Abbu', color: '#B57BFF'},
  {id: 'guest', name: 'Guest', color: '#9AA3B2'},
];

/** In-process stand-in for apps/server: answers hello and pair:request, records what the TV sends. */
export class FakeServer {
  sockets: FakeSocket[] = [];
  received: Array<{type: string; payload: any}> = [];
  online = true;

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
          events: [],
          messages: [],
          devices: [],
          sketch: {roundId: null, phase: 'idle', scores: {}},
          clients: [payload.client],
        },
        you: payload.client,
        token: 'tv-token',
      });
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

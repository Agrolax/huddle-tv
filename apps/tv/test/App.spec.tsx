import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {BackHandler} from 'react-native';
import {App} from '../src/App';
import {FakeServer, fakePicks} from './fakeServer';

// Vega's jest setup mocks addEventListener without returning a subscription.
// Handlers run newest-first, like React Native's BackHandler.
let backHandlers: Array<() => boolean | null | undefined> = [];
beforeEach(() => {
  backHandlers = [];
  (BackHandler.addEventListener as jest.Mock).mockImplementation((_event: string, handler: () => boolean) => {
    backHandlers.push(handler);
    return {remove: () => (backHandlers = backHandlers.filter(h => h !== handler))};
  });
});
afterEach(() => {
  jest.useRealTimers();
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = [...backHandlers].reverse().some(h => h());
  });
  return handled;
}

async function renderApp(server = new FakeServer()) {
  const utils = render(<App createSocket={server.createSocket} />);
  await waitFor(() => expect(server.received.some(m => m.type === 'hello')).toBe(true));
  return {...utils, server};
}

function layoutGrid(getByTestId: (id: string) => any) {
  act(() => {
    fireEvent(getByTestId('home-grid'), 'layout', {nativeEvent: {layout: {x: 0, y: 0, width: 1728, height: 760}}});
  });
}

/** All text under a test id, flattened. */
function textOf(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node) return '';
  const children = node.children ?? [];
  return children.map(textOf).join('');
}

async function goHome(server = new FakeServer()) {
  const utils = await renderApp(server);
  fireEvent.press(utils.getByTestId('continue'));
  layoutGrid(utils.getByTestId);
  return utils;
}

describe('screens', () => {
  it("starts on Who's here with the server's profiles", async () => {
    const {getByText, getByTestId} = await renderApp();
    expect(getByText("Who's here?")).toBeTruthy();
    expect(getByTestId('profile-guest')).toBeTruthy();
  });

  it('toggles a profile with Select', async () => {
    const {getByTestId, getByText} = await renderApp();
    expect(getByText('Continue with 2')).toBeTruthy();
    fireEvent.press(getByTestId('profile-ammu'));
    expect(getByText('Continue with 3')).toBeTruthy();
  });

  it('shows the six widget tiles on Home', async () => {
    const {getByTestId} = await goHome();
    for (const id of ['clock', 'calendar', 'profiles', 'tonight', 'sketch', 'smart-home']) {
      expect(getByTestId(`grid-cell-${id}`)).toBeTruthy();
    }
  });

  it('draws a focus ring only on the focused tile', async () => {
    const {getByTestId, queryAllByTestId} = await goHome();
    expect(queryAllByTestId('focus-ring')).toHaveLength(0);
    act(() => {
      fireEvent(getByTestId('grid-cell-calendar'), 'focus');
    });
    expect(queryAllByTestId('focus-ring')).toHaveLength(1);
  });

  it("the profiles tile returns to Who's here", async () => {
    const {getByTestId, getByText} = await goHome();
    fireEvent.press(getByTestId('grid-cell-profiles'));
    expect(getByText("Who's here?")).toBeTruthy();
  });

  it("Back goes from Home to Who's here, then lets the app exit", async () => {
    const {getByText} = await goHome();
    expect(pressBack()).toBe(true);
    expect(getByText("Who's here?")).toBeTruthy();
    expect(pressBack()).toBe(false);
  });
});

describe('household connection', () => {
  it('says hello as role tv with the household id', async () => {
    const {server} = await renderApp();
    const hello = server.received.find(m => m.type === 'hello')!;
    expect(hello.payload.client.role).toBe('tv');
    expect(hello.payload.householdId).toBe('home');
  });

  it('Continue on Who\'s here tells the server', async () => {
    const {getByTestId, server} = await renderApp();
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(getByTestId('profile-ammu'));
    fireEvent.press(getByTestId('continue'));
    expect(server.received.filter(m => m.type === 'profile:switch').pop()?.payload).toEqual({profileIds: ['rafi', 'nanu', 'ammu']});
  });

  it('a profile switch from a phone updates the profiles tile', async () => {
    const {getByTestId, server} = await goHome();
    act(() => server.push('profile:changed', {profileIds: ['ammu', 'abbu']}));
    expect(getByTestId('grid-cell-profiles').props.accessibilityLabel).toBe("Who's here: Ammu & Abbu. Select to change");
  });

  it("a profile switch from a phone updates Who's here", async () => {
    const {getByText, server} = await renderApp();
    act(() => server.push('profile:changed', {profileIds: ['guest']}));
    expect(getByText('Continue with 1')).toBeTruthy();
  });

  it('a message from a phone shows a toast, then the toast goes', async () => {
    const {getByTestId, queryByTestId, server} = await goHome();
    jest.useFakeTimers({doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask']});
    act(() =>
      server.push('message:new', {id: 'm1', text: 'Pizza night 🍕', fromProfileId: 'ammu', fromClient: 'phone', at: new Date().toISOString()}),
    );
    expect(getByTestId('message-toast').props.accessibilityLabel).toBe('Message from Ammu: Pizza night 🍕');
    expect(textOf(getByTestId('message-toast'))).toMatch(/AmmuPizza night 🍕/);
    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(queryByTestId('message-toast')).toBeNull();
    jest.useRealTimers();
  });

  it('a doorbell ring shows the door alert, then it goes', async () => {
    const {getByTestId, queryByTestId, server} = await goHome();
    jest.useFakeTimers({doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask']});
    act(() =>
      server.push('door:event', {id: 'd1', kind: 'ring', camera: 'Front door', at: new Date().toISOString(), source: 'demo'}),
    );
    expect(textOf(getByTestId('door-alert'))).toMatch(/^Someone is at the doorFront door · /);
    act(() => {
      jest.advanceTimersByTime(16000);
    });
    expect(queryByTestId('door-alert')).toBeNull();
    jest.useRealTimers();
  });
});

describe('Connect overlay', () => {
  it('Connect phone opens the overlay with QR, code and URL', async () => {
    const {getByTestId, server} = await goHome();
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(getByTestId('connect-phone'));
    await waitFor(() => expect(getByTestId('qr-value').props.children).toBe('http://10.0.0.5:5173/?h=home&c=H7K2QP'));
    expect(server.received.some(m => m.type === 'pair:request')).toBe(true);
    expect(getByTestId('connect-code').props.children).toBe('H7K 2QP');
    expect(getByTestId('connect-url').props.children).toBe('http://10.0.0.5:5173/?h=home&c=H7K2QP');
  });

  it('Back closes the overlay and stays on Home', async () => {
    const {getByTestId, queryByTestId, getByText} = await goHome();
    fireEvent.press(getByTestId('connect-phone'));
    expect(getByTestId('connect-overlay')).toBeTruthy();
    expect(pressBack()).toBe(true);
    expect(queryByTestId('connect-overlay')).toBeNull();
    expect(getByTestId('home-grid')).toBeTruthy();
    expect(() => getByText("Who's here?")).toThrow();
  });

  it('Done closes the overlay', async () => {
    const {getByTestId, queryByTestId} = await goHome();
    fireEvent.press(getByTestId('connect-phone'));
    fireEvent.press(getByTestId('connect-done'));
    expect(queryByTestId('connect-overlay')).toBeNull();
  });

  it('shows the server address when offline', async () => {
    const server = new FakeServer();
    server.online = false;
    const utils = render(<App createSocket={server.createSocket} />);
    await waitFor(() => expect(server.sockets.length).toBeGreaterThan(0));
    fireEvent.press(utils.getByTestId('continue'));
    fireEvent.press(utils.getByTestId('connect-phone'));
    expect(utils.getByText('The TV cannot connect to the Huddle server.')).toBeTruthy();
    expect(utils.getByTestId('status-pill')).toBeTruthy();
    expect(utils.getByText(/^ws:\/\//)).toBeTruthy();
    utils.unmount();
  });
});

describe('live widgets', () => {
  it('shows weather from the server on the clock tile and in the greeting', async () => {
    const {getByTestId} = await goHome();
    expect(textOf(getByTestId('weather-line'))).toBe('12° Cloudy');
  });

  it('updates weather when the server pushes new conditions', async () => {
    const {getByTestId, server} = await goHome();
    act(() => server.push('weather:updated', {place: 'Toronto', tempC: 3, code: 71, updatedAt: new Date().toISOString()}));
    expect(textOf(getByTestId('weather-line'))).toBe('3° Snow');
  });

  it('lists upcoming events, hides past ones, and names who they are for', async () => {
    const {getByTestId, queryByTestId} = await goHome();
    expect(textOf(getByTestId('event-e-movie'))).toMatch(/Movie night/);
    expect(textOf(getByTestId('event-e-dentist'))).toMatch(/Dentist/);
    expect(getByTestId('event-e-dentist-ammu')).toBeTruthy();
    expect(queryByTestId('event-e-past')).toBeNull();
  });

  it('adds an event a phone created', async () => {
    const {getByTestId, server} = await goHome();
    const start = new Date(Date.now() + 3_600_000).toISOString();
    act(() => server.push('calendar:updated', {events: [{id: 'e-new', title: 'Soccer', start, profileIds: ['rafi']}]}));
    expect(textOf(getByTestId('event-e-new'))).toMatch(/Soccer/);
    expect(getByTestId('event-e-new-rafi')).toBeTruthy();
  });

  it('shows device state and follows a phone flipping the lamp', async () => {
    const {getByTestId, server} = await goHome();
    expect(textOf(getByTestId('device-living-lamp'))).toBe('LampOn');
    expect(textOf(getByTestId('device-front-door'))).toBe('Front doorLocked');
    act(() => server.push('smart-home:state', {devices: server.devices.map(d => (d.id === 'living-lamp' ? {...d, on: false} : d))}));
    expect(textOf(getByTestId('device-living-lamp'))).toBe('LampOff');
  });
});

describe('Smart home sheet', () => {
  async function openSheet() {
    const utils = await goHome();
    await waitFor(() => expect(utils.server.tv.readyState).toBe(1));
    const tile = utils.getByTestId('grid-cell-smart-home');
    fireEvent.press(tile);
    expect(utils.getByTestId('smart-home-overlay')).toBeTruthy();
    return utils;
  }

  it('Select on the Home tile opens the sheet; toggling the lamp tells the server', async () => {
    const {getByTestId, server} = await openSheet();
    fireEvent.press(getByTestId('smart-living-lamp'));
    expect(server.received.filter(m => m.type === 'smart-home:set').pop()?.payload).toEqual({deviceId: 'living-lamp', on: false});
    expect(textOf(getByTestId('smart-state-living-lamp'))).toBe('Off');
  });

  it('Warmer raises the thermostat; Unlock opens the door', async () => {
    const {getByTestId, server} = await openSheet();
    fireEvent.press(getByTestId('smart-thermostat-up'));
    expect(textOf(getByTestId('smart-state-thermostat'))).toBe('22°');
    fireEvent.press(getByTestId('smart-front-door'));
    expect(server.received.filter(m => m.type === 'smart-home:set').pop()?.payload).toEqual({deviceId: 'front-door', on: false});
    expect(textOf(getByTestId('smart-state-front-door'))).toBe('Unlocked');
  });

  it('Back closes the sheet and stays on Home', async () => {
    const {queryByTestId, getByTestId} = await openSheet();
    expect(pressBack()).toBe(true);
    expect(queryByTestId('smart-home-overlay')).toBeNull();
    expect(getByTestId('home-grid')).toBeTruthy();
  });
});

describe('Tonight', () => {
  async function openTonight(server = new FakeServer()) {
    const utils = await goHome(server);
    await waitFor(() => expect(utils.server.tv.readyState).toBe(1));
    fireEvent.press(utils.getByTestId('grid-cell-tonight'));
    expect(utils.getByTestId('tonight-overlay')).toBeTruthy();
    return utils;
  }
  const requests = (server: FakeServer) => server.received.filter(m => m.type === 'tonight:request');

  it('the tile shows mood placeholders before any picks', async () => {
    const {getByTestId, queryByTestId} = await goHome();
    expect(textOf(getByTestId('grid-cell-tonight'))).toMatch(/CozyFunnyEdge-of-seat/);
    expect(queryByTestId('tonight-tile-pick-0')).toBeNull();
  });

  it('Select on the tile opens the sheet and asks for picks for who is here', async () => {
    const {getByTestId, server} = await openTonight();
    expect(requests(server)).toEqual([{type: 'tonight:request', payload: {}}]);
    expect(textOf(getByTestId('tonight-overlay'))).toMatch(/For Rafi & Nanu/);
    expect(textOf(getByTestId('tonight-pick-0'))).toBe('mix pick 12020 · Prime VideoGood for Rafi & Nanu (mix).');
    expect(getByTestId('tonight-pick-2')).toBeTruthy();
    expect(getByTestId('tonight-demo-note')).toBeTruthy();
  });

  it('shows a loading line until the picks arrive', async () => {
    const server = new FakeServer();
    server.answerTonight = false;
    const {getByTestId, queryByTestId} = await openTonight(server);
    expect(textOf(getByTestId('tonight-loading'))).toBe('Getting picks…');
    act(() => server.sendTonight());
    expect(queryByTestId('tonight-loading')).toBeNull();
    expect(getByTestId('tonight-pick-0')).toBeTruthy();
  });

  it('a mood button asks again with that mood', async () => {
    const {getByTestId, server} = await openTonight();
    fireEvent.press(getByTestId('tonight-mood-edge-of-seat'));
    expect(requests(server).pop()?.payload).toEqual({mood: 'edge-of-seat'});
    expect(textOf(getByTestId('tonight-pick-0'))).toMatch(/^edge-of-seat pick 1/);
    expect(getByTestId('tonight-mood-edge-of-seat').props.accessibilityLabel).toBe('Edge-of-seat picks, selected');
  });

  it('reuses picks that already fit the room, and asks again when the room changes', async () => {
    const server = new FakeServer();
    server.tonight = {picks: fakePicks('cozy'), mood: 'cozy', forProfileIds: ['nanu', 'rafi'], at: new Date().toISOString(), source: 'bedrock'};
    const utils = await goHome(server);
    expect(textOf(utils.getByTestId('tonight-tile-pick-0'))).toBe('cozy pick 1');
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(utils.getByTestId('grid-cell-tonight'));
    expect(requests(server)).toHaveLength(0);
    expect(utils.queryByTestId('tonight-demo-note')).toBeNull();
    pressBack();

    act(() => server.push('profile:changed', {profileIds: ['ammu']}));
    fireEvent.press(utils.getByTestId('grid-cell-tonight'));
    expect(requests(server)).toHaveLength(1);
  });

  it('picks a phone asked for show up on the tile', async () => {
    const {getByTestId, server} = await goHome();
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    act(() => server.sendTonight('funny'));
    expect(textOf(getByTestId('tonight-tile-pick-1'))).toBe('funny pick 2');
  });

  it('Back closes the sheet, stays on Home, and the tile keeps the last picks', async () => {
    const {queryByTestId, getByTestId} = await openTonight();
    expect(pressBack()).toBe(true);
    expect(queryByTestId('tonight-overlay')).toBeNull();
    expect(getByTestId('home-grid')).toBeTruthy();
    expect(textOf(getByTestId('tonight-tile-pick-0'))).toBe('mix pick 1');
  });

  it('Done closes the sheet too', async () => {
    const {queryByTestId, getByTestId} = await openTonight();
    fireEvent.press(getByTestId('tonight-done'));
    expect(queryByTestId('tonight-overlay')).toBeNull();
  });
});

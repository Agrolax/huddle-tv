import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {BackHandler} from 'react-native';
import {App} from '../src/App';
import {FakeServer, PROFILES, fakePicks} from './fakeServer';

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
    fireEvent.press(getByTestId('profile-sam'));
    expect(getByText('Continue with 3')).toBeTruthy();
  });

  it('Add someone shows the QR; the person a phone adds arrives selected', async () => {
    const {getByTestId, getByText, queryByTestId, server} = await renderApp();
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    expect(getByTestId('avatar-maya')).toBeTruthy();
    fireEvent.press(getByTestId('profile-add'));
    expect(textOf(getByTestId('connect-overlay'))).toMatch(/^Add someoneScan with a phone and add yourself/);
    const jo = {id: 'jo', name: 'Jo', color: '#FF6B8B', avatar: 'squish'};
    act(() => server.push('profiles:updated', {profiles: [...PROFILES, jo], savedId: 'jo'}));
    expect(queryByTestId('connect-overlay')).toBeNull();
    expect(getByTestId('here-jo')).toBeTruthy();
    expect(getByText('Continue with 3')).toBeTruthy();
  });

  it('shows the six widget tiles on Home', async () => {
    const {getByTestId} = await goHome();
    for (const id of ['clock', 'calendar', 'profiles', 'tonight', 'game', 'smart-home']) {
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
    fireEvent.press(getByTestId('profile-sam'));
    fireEvent.press(getByTestId('continue'));
    expect(server.received.filter(m => m.type === 'profile:switch').pop()?.payload).toEqual({profileIds: ['maya', 'leo', 'sam']});
  });

  it('a profile switch from a phone updates the profiles tile', async () => {
    const {getByTestId, server} = await goHome();
    act(() => server.push('profile:changed', {profileIds: ['maya', 'sam']}));
    expect(getByTestId('grid-cell-profiles').props.accessibilityLabel).toBe("Who's here: Maya & Sam. Select to change");
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
      server.push('message:new', {id: 'm1', text: 'Pizza night 🍕', fromProfileId: 'maya', fromClient: 'phone', at: new Date().toISOString()}),
    );
    expect(getByTestId('message-toast').props.accessibilityLabel).toBe('Message from Maya: Pizza night 🍕');
    expect(textOf(getByTestId('message-toast'))).toMatch(/MayaPizza night 🍕/);
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
    expect(getByTestId('event-e-dentist-maya')).toBeTruthy();
    expect(queryByTestId('event-e-past')).toBeNull();
  });

  it('the week opens from the tile: next up, tonight, a column per day; Back closes it', async () => {
    const {getByTestId, queryByTestId} = await goHome();
    expect(textOf(getByTestId('calendar-next-line'))).toMatch(/^Next: Movie night · /);
    fireEvent.press(getByTestId('grid-cell-calendar'));
    expect(textOf(getByTestId('calendar-next'))).toMatch(/^Next upMovie night.* · Everyone$/);
    expect(getByTestId('calendar-day-6')).toBeTruthy();
    expect(textOf(getByTestId('calendar-day-0'))).toMatch(/^Today/);
    expect(getByTestId('calendar-event-e-dentist')).toBeTruthy();
    expect(queryByTestId('calendar-event-e-past')).toBeNull();
    expect(pressBack()).toBe(true);
    expect(queryByTestId('calendar-overlay')).toBeNull();
  });

  it('adds an event a phone created', async () => {
    const {getByTestId, server} = await goHome();
    const start = new Date(Date.now() + 3_600_000).toISOString();
    act(() => server.push('calendar:updated', {events: [{id: 'e-new', title: 'Soccer', start, profileIds: ['leo']}]}));
    expect(textOf(getByTestId('event-e-new'))).toMatch(/Soccer/);
    expect(getByTestId('event-e-new-leo')).toBeTruthy();
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
    expect(textOf(getByTestId('tonight-overlay'))).toMatch(/For Leo & Maya/);
    expect(textOf(getByTestId('tonight-pick-0'))).toBe('mix pick 12020 · Prime Video');
    expect(textOf(getByTestId('tonight-hero'))).toBe('mix pick 12020 · Prime VideoGood for Leo & Nora (mix).');
    expect(getByTestId('tonight-pick-2')).toBeTruthy();
    expect(getByTestId('tonight-demo-note')).toBeTruthy();
    expect(getByTestId('tonight-backdrop').props.accessibilityLabel).toBe('Drawn backdrop');
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

  it('focusing a pick puts it in the hero, and painted art replaces the drawn scene', async () => {
    const {getByTestId, server} = await openTonight();
    fireEvent(getByTestId('tonight-pick-2'), 'focus');
    expect(textOf(getByTestId('tonight-hero'))).toMatch(/^mix pick 3/);
    const picks = server.tonight.picks.map((p: object, i: number) => ({...p, image: `/art/${'ab'.repeat(8)}.png`, n: i}));
    act(() => server.push('tonight:picks', {...server.tonight, picks, source: 'bedrock'}));
    expect(getByTestId('tonight-backdrop').props.accessibilityLabel).toBe('Painted backdrop');
    expect(getByTestId('tonight-backdrop-image').props.source.uri).toMatch(/^http:\/\/[^/]+:8787\/art\/(ab){8}\.png$/);
    expect(textOf(getByTestId('tonight-source'))).toBe('Picked by Amazon Nova · art by Nova Canvas');
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
    server.tonight = {picks: fakePicks('cozy'), mood: 'cozy', forProfileIds: ['maya', 'leo'], at: new Date().toISOString(), source: 'bedrock'};
    const utils = await goHome(server);
    expect(textOf(utils.getByTestId('tonight-tile-pick-0'))).toBe('cozy pick 1');
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(utils.getByTestId('grid-cell-tonight'));
    expect(requests(server)).toHaveLength(0);
    expect(utils.queryByTestId('tonight-demo-note')).toBeNull();
    pressBack();

    act(() => server.push('profile:changed', {profileIds: ['nora']}));
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

describe('Game night', () => {
  const question = {
    gameId: 'g1',
    phase: 'question',
    kind: 'quiz',
    source: 'our-week',
    title: 'Our Week',
    round: 2,
    rounds: 5,
    question: {id: 'g1-2', text: 'Who has Dentist tomorrow?', choices: ['Leo', 'Maya', 'Nora', 'Sam']},
    endsAt: new Date(Date.now() + 20_000).toISOString(),
    answered: ['leo'],
    scores: {leo: 0},
  };

  async function openGame(server = new FakeServer()) {
    const utils = await goHome(server);
    await waitFor(() => expect(utils.server.tv.readyState).toBe(1));
    fireEvent.press(utils.getByTestId('grid-cell-game'));
    expect(utils.getByTestId('game-overlay')).toBeTruthy();
    return utils;
  }
  const sent = (server: FakeServer, type: string) => server.received.filter(m => m.type === type);

  it('the tile invites a quiz, then shows who leads the league', async () => {
    const server = new FakeServer();
    const {getByTestId} = await goHome(server);
    expect(textOf(getByTestId('game-tile-line'))).toBe('Play a quiz on your phones.');
    act(() => server.push('league:updated', {nora: {points: 2400, wins: 2, games: 2}, leo: {points: 900, wins: 0, games: 2}}));
    expect(textOf(getByTestId('game-tile-line'))).toBe('Nora leads the league.');
  });

  it('Select opens the menu; Our Week and Watched It start a quiz', async () => {
    const server = new FakeServer();
    server.tonight = {picks: fakePicks('cozy'), mood: 'cozy', forProfileIds: ['leo', 'maya'], at: new Date().toISOString(), source: 'mock'};
    const {getByTestId} = await openGame(server);
    expect(textOf(getByTestId('game-league'))).toMatch(/Play a quiz to start the league\./);
    fireEvent.press(getByTestId('game-start-our-week'));
    expect(sent(server, 'game:start').pop()?.payload).toEqual({kind: 'quiz', source: 'our-week'});
    expect(textOf(getByTestId('game-start-watched-it'))).toBe('Watched It: cozy pick 1');
    fireEvent.press(getByTestId('game-start-watched-it'));
    expect(sent(server, 'game:start').pop()?.payload).toEqual({kind: 'quiz', source: 'watched-it', title: 'cozy pick 1'});
  });

  it('a game a phone starts opens on the TV, with the question and who answered', async () => {
    const server = new FakeServer();
    const {getByTestId} = await goHome(server);
    act(() => server.push('game:state', question));
    expect(textOf(getByTestId('game-overlay'))).toMatch(/Our WeekQuestion 2 of 5Who has Dentist tomorrow\?/);
    expect(getByTestId('game-choice-1').props.accessibilityLabel).toBe('B: Maya');
    expect(textOf(getByTestId('game-answered'))).toMatch(/1 answered · \d+ s/);
    fireEvent.press(getByTestId('game-next'));
    expect(sent(server, 'game:next').pop()?.payload).toEqual({gameId: 'g1'});
  });

  it('the reveal marks the right answer in words and shows points', async () => {
    const server = new FakeServer();
    const {getByTestId} = await goHome(server);
    act(() =>
      server.push('game:state', {...question, phase: 'reveal', correct: 1, choices: {leo: 1, nora: 0}, gained: {leo: 850, nora: 0}, scores: {leo: 850, nora: 0}}),
    );
    expect(getByTestId('game-choice-1').props.accessibilityLabel).toBe('B: Maya, right answer');
    expect(textOf(getByTestId('game-choice-1'))).toMatch(/Right answer/);
    expect(textOf(getByTestId('game-gained'))).toBe('+8500');
    expect(textOf(getByTestId('game-next'))).toBe('Next question');
  });

  it('final scores, then the league; Back closes the sheet and End game ends it', async () => {
    const server = new FakeServer();
    const {getByTestId, queryByTestId} = await goHome(server);
    act(() => server.push('game:state', question));
    act(() => server.push('game:state', {...question, phase: 'final', round: 5, answered: [], scores: {leo: 850, nora: 1700}}));
    act(() => server.push('league:updated', {leo: {points: 850, wins: 0, games: 1}, nora: {points: 1700, wins: 1, games: 1}}));
    expect(textOf(getByTestId('game-final'))).toBe('1Nora17002Leo850');
    expect(textOf(getByTestId('game-league'))).toMatch(/Family league1Nora1 win17002Leo850/);
    expect(textOf(getByTestId('game-tile-line'))).toBe('Nora won the quiz.');
    expect(pressBack()).toBe(true);
    expect(queryByTestId('game-overlay')).toBeNull();

    act(() => server.push('game:state', {...question, gameId: 'g2'}));
    fireEvent.press(getByTestId('game-end'));
    expect(sent(server, 'game:end').pop()?.payload).toEqual({gameId: 'g2'});
  });
});

describe('Secret veto', () => {
  const picks = () => ({...{picks: fakePicks('cozy')}, mood: 'cozy', forProfileIds: ['leo', 'maya'], at: new Date().toISOString(), source: 'mock'});

  async function openTonight(server = new FakeServer()) {
    server.tonight = picks();
    const utils = await goHome(server);
    await waitFor(() => expect(utils.server.tv.readyState).toBe(1));
    fireEvent.press(utils.getByTestId('grid-cell-tonight'));
    return utils;
  }

  it('shows when tonight has to end and how long each pick runs', async () => {
    const server = new FakeServer();
    server.tonight = {
      ...picks(),
      picks: fakePicks('cozy').map((p, i) => ({...p, minutes: [104, 86, 50][i]})),
      endsBy: {at: new Date().toISOString(), label: '8:30', reason: "Leo's bedtime"},
    };
    const {getByTestId} = await goHome(server);
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    expect(textOf(getByTestId('grid-cell-tonight'))).toMatch(/Tonight · ends by 8:30/);
    fireEvent.press(getByTestId('grid-cell-tonight'));
    expect(textOf(getByTestId('tonight-overlay'))).toMatch(/For Leo & Maya · Ends by 8:30 \(Leo's bedtime\)/);
    expect(textOf(getByTestId('tonight-pick-0'))).toMatch(/2020 · Prime Video · 1 h 44 min/);
    expect(textOf(getByTestId('tonight-pick-2'))).toMatch(/50 min/);
  });

  it('Vote on phones starts the vote; the TV shows who voted, never how', async () => {
    const {getByTestId, server} = await openTonight();
    fireEvent.press(getByTestId('tonight-vote'));
    expect(server.received.some(m => m.type === 'tonight:vote-start')).toBe(true);
    act(() =>
      server.push('tonight:vote-state', {voteId: 'v1', phase: 'voting', options: [0, 1, 2], voted: ['nora'], endsAt: new Date(Date.now() + 60_000).toISOString()}),
    );
    const progress = textOf(getByTestId('vote-progress'));
    expect(progress).toMatch(/Vote on your phones\. Nobody sees your vote\./);
    expect(textOf(getByTestId('vote-voted'))).toMatch(/WaitingVoted1 of 2 voted · \d+ s/);
    fireEvent.press(getByTestId('vote-next'));
    expect(server.received.filter(m => m.type === 'tonight:vote-next').pop()?.payload).toEqual({voteId: 'v1'});
  });

  it('sudden death, then the result marks tonight’s pick on the sheet and the tile', async () => {
    const {getByTestId, server} = await openTonight();
    act(() => server.push('tonight:vote-state', {voteId: 'v1', phase: 'sudden-death', options: [0, 2], voted: []}));
    expect(textOf(getByTestId('vote-progress'))).toMatch(/Sudden death/);
    expect(() => getByTestId('tonight-pick-1')).toThrow();
    act(() => server.push('tonight:vote-state', {voteId: 'v1', phase: 'result', options: [0, 2], voted: ['leo', 'nora'], accepted: [], winner: 2, decidedBy: 'sudden-death'}));
    act(() => server.push('tonight:picks', {...picks(), chosen: 2}));
    expect(textOf(getByTestId('vote-result'))).toMatch(/Sudden death: cozy pick 3 wins\./);
    expect(textOf(getByTestId('tonight-pick-2'))).toMatch(/^Tonight's pick/);
    fireEvent.press(getByTestId('vote-done'));
    expect(server.received.filter(m => m.type === 'tonight:vote-end').pop()?.payload).toEqual({voteId: 'v1'});
    act(() => server.push('tonight:vote-state', {voteId: null, phase: 'idle', options: [], voted: []}));
    fireEvent.press(getByTestId('tonight-done'));
    expect(textOf(getByTestId('grid-cell-tonight'))).toMatch(/Tonight · cozy pick 3/);
  });
});

describe('Sketch the pick', () => {
  const round = {
    gameId: 's1',
    phase: 'question',
    kind: 'sketch',
    title: 'Sketch the pick',
    round: 1,
    rounds: 3,
    endsAt: new Date(Date.now() + 60_000).toISOString(),
    answered: [],
    scores: {leo: 0, nora: 0},
    drawerId: 'leo',
    hint: '__________ 2',
  };

  it('the menu starts it when two phones are here', async () => {
    const server = new FakeServer();
    const {getByTestId} = await goHome(server);
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(getByTestId('grid-cell-game'));
    fireEvent.press(getByTestId('game-start-sketch'));
    expect(server.received.filter(m => m.type === 'game:start').pop()?.payload).toEqual({kind: 'sketch'});
  });

  it('needs two phones', async () => {
    const server = new FakeServer();
    server.phones = server.phones.slice(0, 1);
    const {getByTestId} = await goHome(server);
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(getByTestId('grid-cell-game'));
    expect(textOf(getByTestId('game-overlay'))).toMatch(/Sketch the pick needs two phones\./);
    fireEvent.press(getByTestId('game-start-sketch'));
    expect(server.received.some(m => m.type === 'game:start')).toBe(false);
  });

  it('draws strokes as they stream, shows the hint and guesses, then the answer', async () => {
    const server = new FakeServer();
    const {getByTestId, getAllByTestId, queryAllByTestId} = await goHome(server);
    act(() => server.push('game:state', round));
    expect(textOf(getByTestId('game-sketch'))).toMatch(/Leo is drawing/);
    expect(textOf(getByTestId('game-sketch-hint'))).toBe('_ _ _ _ _ _ _ _ _ _    2');
    const stroke = {id: 'a', color: '#3D8BFF', width: 0.01, points: [{x: 0.1, y: 0.1}, {x: 0.5, y: 0.5}]};
    act(() => server.push('sketch:stroke', {gameId: 's1', round: 1, stroke}));
    act(() => server.push('sketch:stroke', {gameId: 's1', round: 1, stroke: {...stroke, points: [{x: 1, y: 0.75}]}}));
    // One path per pen color; the blue one holds the stroke.
    expect(getAllByTestId('svg-path').map(p => p.props.accessibilityLabel)).toContain('M88.0 66.0 L440.0 330.0 880.0 495.0');
    act(() => server.push('sketch:guess', {gameId: 's1', round: 1, profileId: 'nora', text: 'cars', correct: false}));
    act(() => server.push('sketch:guess', {gameId: 's1', round: 1, profileId: 'nora', correct: true}));
    expect(textOf(getByTestId('game-guesses'))).toMatch(/Nora: carsNora got it/);
    act(() => server.push('game:state', {...round, phase: 'reveal', answered: ['nora'], answer: 'Paddington 2', gained: {nora: 900, leo: 250}}));
    expect(textOf(getByTestId('game-sketch-answer'))).toBe('Paddington 2');
    expect(textOf(getByTestId('game-gained'))).toBe("+250+900");
    // The next round starts blank.
    act(() => server.push('game:state', {...round, round: 2, drawerId: 'nora'}));
    expect(queryAllByTestId('svg-path').every(p => p.props.accessibilityLabel === 'M0 0')).toBe(true);
    expect(textOf(getByTestId('game-sketch'))).toMatch(/Nora is drawing/);
  });
});

describe('Game night opens itself', () => {
  it('after the sheet that was in the way closes', async () => {
    const server = new FakeServer();
    const {getByTestId, queryByTestId} = await goHome(server);
    await waitFor(() => expect(server.tv.readyState).toBe(1));
    fireEvent.press(getByTestId('connect-phone'));
    act(() => server.push('game:state', {gameId: 'g9', phase: 'question', kind: 'quiz', title: 'Our Week', round: 1, rounds: 5, question: {id: 'q', text: 'Q?', choices: ['a', 'b', 'c', 'd']}, endsAt: new Date(Date.now() + 20_000).toISOString(), answered: [], scores: {}}));
    expect(queryByTestId('game-overlay')).toBeNull();
    expect(pressBack()).toBe(true);
    expect(getByTestId('game-overlay')).toBeTruthy();
  });
});

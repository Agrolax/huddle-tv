import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {BackHandler} from 'react-native';
import {App} from '../src/App';
import {FakeServer} from './fakeServer';

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

async function goHome() {
  const utils = await renderApp();
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

  it('a profile switch from a phone updates the greeting and the profiles tile', async () => {
    const {getByText, server} = await goHome();
    act(() => server.push('profile:changed', {profileIds: ['ammu', 'abbu']}));
    expect(getByText(/, Ammu & Abbu$/)).toBeTruthy();
  });

  it("a profile switch from a phone updates Who's here", async () => {
    const {getByText, server} = await renderApp();
    act(() => server.push('profile:changed', {profileIds: ['guest']}));
    expect(getByText('Continue with 1')).toBeTruthy();
  });

  it('a message from a phone shows a toast and the greeting subline, then the toast goes', async () => {
    const {getByTestId, queryByTestId, server} = await goHome();
    expect(getByTestId('greeting-subline').props.children.join('')).toMatch(/connect a phone to send messages/);
    jest.useFakeTimers({doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask']});
    act(() =>
      server.push('message:new', {id: 'm1', text: 'Pizza night 🍕', fromProfileId: 'ammu', fromClient: 'phone', at: new Date().toISOString()}),
    );
    expect(getByTestId('message-toast').props.accessibilityLabel).toBe('Message from Ammu: Pizza night 🍕');
    expect(getByTestId('greeting-subline').props.children.join('')).toMatch(/Ammu: “Pizza night 🍕”/);
    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(queryByTestId('message-toast')).toBeNull();
    // The subline keeps the latest message.
    expect(getByTestId('greeting-subline').props.children.join('')).toMatch(/Pizza night/);
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
    expect(utils.getByText("The TV can't reach the Huddle server.")).toBeTruthy();
    expect(utils.getByText(/^ws:\/\//)).toBeTruthy();
    utils.unmount();
  });
});

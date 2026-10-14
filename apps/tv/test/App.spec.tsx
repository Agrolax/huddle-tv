import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {BackHandler} from 'react-native';
import {App} from '../src/App';

// Vega's jest setup mocks addEventListener without returning a subscription.
let backHandlers: Array<() => boolean | null | undefined> = [];
beforeEach(() => {
  backHandlers = [];
  (BackHandler.addEventListener as jest.Mock).mockImplementation((_event: string, handler: () => boolean) => {
    backHandlers.push(handler);
    return {remove: () => (backHandlers = backHandlers.filter(h => h !== handler))};
  });
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.some(h => h());
  });
  return handled;
}

function goHome() {
  const utils = render(<App />);
  fireEvent.press(utils.getByTestId('continue'));
  act(() => {
    fireEvent(utils.getByTestId('home-grid'), 'layout', {
      nativeEvent: {layout: {x: 0, y: 0, width: 1728, height: 760}},
    });
  });
  return utils;
}

describe('App', () => {
  it("starts on Who's here", () => {
    const {getByText} = render(<App />);
    expect(getByText("Who's here?")).toBeTruthy();
  });

  it('toggles a profile with Select', () => {
    const {getByTestId, getByText} = render(<App />);
    expect(getByText('Continue with 2')).toBeTruthy();
    fireEvent.press(getByTestId('profile-ammu'));
    expect(getByText('Continue with 3')).toBeTruthy();
  });

  it('shows the six widget tiles on Home', () => {
    const {getByTestId} = goHome();
    for (const id of ['clock', 'calendar', 'profiles', 'tonight', 'sketch', 'smart-home']) {
      expect(getByTestId(`grid-cell-${id}`)).toBeTruthy();
    }
  });

  it('draws a focus ring only on the focused tile', () => {
    const {getByTestId, queryAllByTestId} = goHome();
    expect(queryAllByTestId('focus-ring')).toHaveLength(0);
    act(() => {
      fireEvent(getByTestId('grid-cell-calendar'), 'focus');
    });
    expect(queryAllByTestId('focus-ring')).toHaveLength(1);
    act(() => {
      fireEvent(getByTestId('grid-cell-calendar'), 'blur');
      fireEvent(getByTestId('grid-cell-sketch'), 'focus');
    });
    expect(queryAllByTestId('focus-ring')).toHaveLength(1);
  });

  it('the profiles tile returns to Who\'s here', () => {
    const {getByTestId, getByText} = goHome();
    fireEvent.press(getByTestId('grid-cell-profiles'));
    expect(getByText("Who's here?")).toBeTruthy();
  });
});

describe('Back key', () => {
  it("goes from Home to Who's here, then lets the app exit", () => {
    const {getByText} = goHome();
    expect(pressBack()).toBe(true);
    expect(getByText("Who's here?")).toBeTruthy();
    expect(pressBack()).toBe(false);
  });
});

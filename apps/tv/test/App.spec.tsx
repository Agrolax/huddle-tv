import React from 'react';
import {render} from '@testing-library/react-native';
import {App} from '../src/App';

describe('App', () => {
  it('renders the Who\'s here screen first', () => {
    const {getByText} = render(<App />);
    expect(getByText("Who's here?")).toBeTruthy();
  });
});

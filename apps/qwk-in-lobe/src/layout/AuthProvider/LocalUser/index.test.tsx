/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useUserStore } from '@/store/user';

import LocalUserAuthProvider from './index';

afterEach(() => {
  act(() => {
    useUserStore.setState({ isLoaded: undefined, isSignedIn: undefined });
  });
});

describe('LocalUserAuthProvider', () => {
  // Without these flags the home page never requests the user state or the
  // inbox agent, and its send button waits forever on the agent config.
  it('marks the local user as loaded and signed in', () => {
    render(
      <LocalUserAuthProvider>
        <span>app</span>
      </LocalUserAuthProvider>,
    );

    expect(screen.getByText('app')).toBeTruthy();
    expect(useUserStore.getState().isLoaded).toBe(true);
    expect(useUserStore.getState().isSignedIn).toBe(true);
  });
});

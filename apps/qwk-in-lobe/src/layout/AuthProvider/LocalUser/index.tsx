'use client';

import { memo, type PropsWithChildren } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useUserStore } from '@/store/user';

/**
 * There is no sign-in: the server resolves every request to the one local user
 * (`apps/server/src/modules/LocalUser`), so the client is always signed in.
 *
 * Better Auth's session sync used to set these two flags. Without them
 * `isLogin` stays false, so the user state, the inbox agent and the topic list
 * are never fetched: the home page sits on skeletons and its send button stays
 * disabled waiting for an agent config that is never requested.
 */
const LocalUserAuthProvider = memo<PropsWithChildren>(({ children }) => {
  const useStoreUpdater = createStoreUpdater(useUserStore);

  useStoreUpdater('isLoaded', true);
  useStoreUpdater('isSignedIn', true);

  return children;
});

LocalUserAuthProvider.displayName = 'LocalUserAuthProvider';

export default LocalUserAuthProvider;

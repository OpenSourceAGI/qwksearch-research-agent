/**
 * SessionProvider and `useSession` hook wrapping better-auth to expose the current user, authentication
 * status, and Google OAuth sign-in/sign-out actions throughout the application.
 */
'use client';

import { authClient } from '@/lib/auth/client';
import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

interface SessionContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: () => { },
  signOut: async () => { },
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch session on mount
    const fetchSession = async () => {
      try {
        const { data } = await authClient.getSession();
        setUser(data?.user ?? null);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  const signIn = () => {
    authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });
  };

  const signOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setUser(null);
            window.location.href = '/';
          },
        },
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

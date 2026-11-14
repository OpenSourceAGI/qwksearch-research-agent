/**
 * @file provider.tsx
 * @description Root provider component that sets up Fumadocs and search functionality.
 */
'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import SearchDialog from '@/components/fumadocs/layout/search';
import type { ReactNode } from 'react';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        SearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}
/**
 * @fileoverview Context for providing a shared history state among multiple editor instances.
 */

import type { HistoryState } from '@lexical/react/LexicalHistoryPlugin';
import type { JSX } from 'react';

import { createEmptyHistoryState } from '@lexical/react/LexicalHistoryPlugin';
import * as React from 'react';
import { createContext, ReactNode, useContext, useMemo } from 'react';

/**
 * Shape of the history context.
 */
type ContextShape = {
  /** The shared Lexical history state */
  historyState?: HistoryState;
};

const Context: React.Context<ContextShape> = createContext({});

/**
 * Context provider for the shared history state.
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped by the provider.
 * @returns {JSX.Element} The rendered context provider.
 */
export const SharedHistoryContext = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const historyContext = useMemo(
    () => ({ historyState: createEmptyHistoryState() }),
    [],
  );
  return <Context.Provider value={historyContext}>{children}</Context.Provider>;
};

/**
 * Hook to access the shared history context.
 * @returns {ContextShape} The current history state.
 */
export const useSharedHistoryContext = (): ContextShape => {
  return useContext(Context);
};

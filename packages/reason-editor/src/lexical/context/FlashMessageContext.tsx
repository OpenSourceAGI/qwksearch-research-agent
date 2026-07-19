/**
 * @fileoverview Context for managing and displaying flash messages in the editor.
 */


import type { JSX } from 'react';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import FlashMessage from '../ui/FlashMessage';

/**
 * Function type to show a flash message.
 * @param {React.ReactNode} [message] - The message to display.
 * @param {number} [duration] - Duration in milliseconds to show the message.
 */
export type ShowFlashMessage = (
  message?: React.ReactNode,
  duration?: number,
) => void;

interface FlashMessageProps {
  message?: React.ReactNode;
  duration?: number;
}

const Context = createContext<ShowFlashMessage | undefined>(undefined);
const INITIAL_STATE: FlashMessageProps = {};
const DEFAULT_DURATION = 1000;

/**
 * Context provider for flash messages.
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped by the provider.
 * @returns {JSX.Element} The rendered context provider.
 */
export const FlashMessageContext = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [props, setProps] = useState(INITIAL_STATE);
  const showFlashMessage = useCallback<ShowFlashMessage>(
    (message, duration) =>
      setProps(message ? { duration, message } : INITIAL_STATE),
    [],
  );
  useEffect(() => {
    if (props.message) {
      const timeoutId = setTimeout(
        () => setProps(INITIAL_STATE),
        props.duration ?? DEFAULT_DURATION,
      );
      return () => clearTimeout(timeoutId);
    }
  }, [props]);
  return (
    <Context.Provider value={showFlashMessage}>
      {children}
      {props.message && <FlashMessage>{props.message}</FlashMessage>}
    </Context.Provider>
  );
};

/**
 * Hook to access the flash message context.
 * @returns {ShowFlashMessage} The function to show flash messages.
 * @throws {Error} If used outside of a FlashMessageContext provider.
 */
export const useFlashMessageContext = (): ShowFlashMessage => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('Missing FlashMessageContext');
  }
  return ctx;
};

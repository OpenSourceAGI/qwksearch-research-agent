/**
 * Lightweight event-bus (mitt) React context with `useBus` and `useListener` hooks. Lets decoupled editor components communicate via named events, such as opening upload dialogs.
 */

import React from 'react';

import mitt from '@/utils/mitt';

const iMitt = mitt();

export const BusContext = React.createContext(iMitt);

export const useBus = () => React.useContext(BusContext);

export function useListener(fn: (event: any) => void, events: string[]) {
  const bus = useBus();

  React.useEffect(() => {
    events.map((e) => bus.on(e, fn));
    return () => {
      events.map((e) => bus.off(e, fn));
    };
  }, [bus, events, fn]);
}

export const emit = iMitt.emit;

export function ReactBusProvider({ children }: { children: React.ReactNode }) {
  return <BusContext.Provider value={iMitt}>{children}</BusContext.Provider>;
}

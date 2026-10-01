'use client';

/**
 * Mounts the live demo (`App.tsx`) on the client only.
 *
 * The demo reads the browser from its first render (the admin token in
 * sessionStorage, favorites in localStorage, the `#admin` hash) and talks to
 * `/api/*` from effects, so there is nothing useful to server-render: the
 * page ships a placeholder and the demo replaces it once hydrated.
 */
import { useEffect, useState } from 'react';

import { App } from './App';

export function DemoMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="eyt-demo">
      {mounted ? (
        <App />
      ) : (
        <main className="page">
          <p className="header">Loading the live demo…</p>
        </main>
      )}
    </div>
  );
}

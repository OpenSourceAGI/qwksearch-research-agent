'use client';

// Browser Unified SDK init. Runs in the browser only, once, before the user
// interacts — the Analytics project API key is public and ingestion-scoped, so
// it ships in the client bundle by design (see the `NEXT_PUBLIC_` note below).
import { useEffect } from 'react';
import { initAll } from '@amplitude/unified';
import { traceSsr } from '@/lib/debug/ssr-trace';

/**
 * Initializes Amplitude for the whole web app.
 *
 * Renders nothing. Autocapture and Session Replay are the setup defaults; any
 * consent, opt-out, masking, or sampling control already in place still wins.
 *
 * @returns {null} Nothing is rendered
 */
export function Amplitude() {
  useEffect(() => {
    // Without this guard a missing key fails silently and the app looks
    // instrumented while sending nothing.
    const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (!key) {
      console.error(
        '[amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY is not set — no events will be sent',
      );
      return;
    }
    traceSsr('amplitude:init');
    // The key is the positional first argument: `initAll({ apiKey, ... })`
    // compiles, runs, and initializes nothing.
    initAll(key, {
      serverZone: 'US',
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
  }, []);

  return null;
}

traceSsr('module:components/layout/Amplitude');

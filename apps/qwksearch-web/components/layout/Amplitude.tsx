'use client';

// Browser Unified SDK init. Runs in the browser only, once, before the user
// interacts — the Analytics project API key is public and ingestion-scoped, so
// it ships in the client bundle by design (see the `NEXT_PUBLIC_` note below).
import { useEffect, useRef } from 'react';
import { initAll, reset, setUserId, track } from '@amplitude/unified';
import { authClient } from '@/lib/auth/client';
import { traceSsr } from '@/lib/debug/ssr-trace';

/**
 * Share of sessions Session Replay records, 0–1. Defaults to 10%; set
 * `NEXT_PUBLIC_AMPLITUDE_REPLAY_SAMPLE_RATE=1` while verifying capture.
 */
function replaySampleRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_AMPLITUDE_REPLAY_SAMPLE_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.1;
}

// Reinitializing Browser SDK 2 tears down registered plugins (Session
// Replay among them), so init happens once per page load and every identity
// call waits on the same promise.
let initPromise: Promise<boolean> | undefined;

function initAmplitude(): Promise<boolean> {
  if (initPromise) return initPromise;
  // Without this guard a missing key fails silently and the app looks
  // instrumented while sending nothing.
  const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!key) {
    console.error(
      '[amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY is not set — no events will be sent',
    );
    initPromise = Promise.resolve(false);
    return initPromise;
  }
  traceSsr('amplitude:init');
  // The key is the positional first argument: `initAll({ apiKey, ... })`
  // compiles, runs, and initializes nothing.
  initPromise = initAll(key, {
    serverZone: 'US',
    analytics: { autocapture: true },
    sessionReplay: {
      sampleRate: replaySampleRate(),
      // `medium` masks every input field (search queries, emails, API keys
      // typed into Settings) while leaving page text readable. Anything marked
      // `data-amp-mask` is masked too, and `data-amp-block` is not recorded.
      privacyConfig: {
        defaultMaskLevel: 'medium',
        maskSelector: ['[data-amp-mask]'],
        blockSelector: ['[data-amp-block]'],
      },
    },
  }).then(
    () => true,
    (error: unknown) => {
      console.error('[amplitude] init failed', error);
      return false;
    },
  );
  return initPromise;
}

/**
 * Initializes Amplitude (analytics, autocapture, Session Replay) for the whole
 * web app and keeps its User ID in step with the Better Auth session: a
 * signed-in, non-anonymous user is identified by their account ID on login and
 * on session restore, and the identity is reset on logout so the next person
 * on a shared browser is not attributed to the previous account. Anonymous
 * (guest) sessions keep the SDK's own device ID.
 *
 * Renders nothing.
 *
 * @returns {null} Nothing is rendered
 */
export function Amplitude() {
  const { data: session, isPending } = authClient.useSession();
  // The plugin-extended session type doesn't resolve here, so narrow it to
  // the two fields this needs.
  const user = (
    session as { user?: { id?: string; isAnonymous?: boolean | null } } | null
  )?.user;
  const userId = user && !user.isAnonymous && user.id ? String(user.id) : undefined;
  const identifiedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    void initAmplitude();
  }, []);

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    void initAmplitude().then((ready) => {
      if (!ready || cancelled) return;
      const previous = identifiedRef.current;
      if (userId === previous) return;
      if (userId) {
        // Switching straight from one account to another starts a fresh
        // device ID so the two accounts' events don't share one.
        if (previous) reset();
        setUserId(userId);
        track('User Identified');
      } else if (previous) {
        // Logout: clears the User ID and rotates the device ID.
        reset();
      }
      identifiedRef.current = userId;
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isPending]);

  return null;
}

traceSsr('module:components/layout/Amplitude');

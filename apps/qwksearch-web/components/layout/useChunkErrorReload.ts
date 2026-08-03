'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'qwk:chunk-error-reload';

const isChunkLoadError = (message: unknown): boolean =>
  typeof message === 'string' && /Loading (chunk|CSS chunk)|ChunkLoadError/i.test(message);

/**
 * Deployments replace `_next/static` chunks with newly-hashed filenames, so a
 * browser tab left open from before a deploy will 404 when it tries to fetch
 * an old chunk (e.g. on a client-side navigation). Reload once to pick up the
 * new build instead of leaving the user stuck on a broken page; the
 * sessionStorage flag stops a reload loop if the new build somehow fails too.
 */
export function useChunkErrorReload(): void {
  useEffect(() => {
    const reloadOnce = (message: unknown): void => {
      if (!isChunkLoadError(message)) return;
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    };

    const onError = (event: ErrorEvent): void => reloadOnce(event.message);
    const onRejection = (event: PromiseRejectionEvent): void =>
      reloadOnce(event.reason?.message ?? event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
}

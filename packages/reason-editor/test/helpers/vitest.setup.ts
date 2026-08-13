/**
 * Shared test setup.
 *
 * ProseMirror's `DOMObserver.stop()` schedules one final `flush()` 20ms out when
 * the view still has pending DOM mutations, and nothing cancels that timer — so a
 * test file that destroys or unmounts an editor at the very end leaves a callback
 * queued past its own lifetime. Vitest tears the jsdom environment down first, and
 * the callback then reaches for `document` from whatever file happens to be running
 * next, surfacing as an unhandled "document is not defined" that fails the run
 * without failing any test.
 *
 * Holding the file open a beat longer lets that flush land while its own jsdom is
 * still standing.
 */
import { afterAll } from 'vitest';

/** Comfortably past ProseMirror's own 20ms flush delay. */
const PENDING_FLUSH_MS = 30;

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, PENDING_FLUSH_MS));
});

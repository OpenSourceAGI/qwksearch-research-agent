/**
 * Per-user extraction preferences (`/api/doc/extraction-settings`) — the
 * backend of the Extraction settings pane (migration to-do § 2.2).
 *
 * GET    → the user's stored overrides, plus what is actually in force once the
 *          operator's environment is folded in, plus the field metadata the
 *          pane needs to build its inputs without hard-coding the enums.
 * PUT    → replace the overrides with the validated form of the body.
 * DELETE → drop them, returning the user to the operator's configuration.
 *
 * Sign-in is required on all three: these are per-user preferences, and the
 * anonymous equivalent is the `?cite=` / `?lang=` query parameters that
 * `/api/doc/article` already honours.
 */
import { Hono } from 'hono';

import {
  clearUserExtractionOverrides,
  loadUserExtractionOverrides,
  saveUserExtractionOverrides,
} from '../../qwksearch/extractionPreferences';
import {
  CITATION_STYLES,
  DEFAULT_TIER_ORDER,
  extractionSettingsForClient,
  PDF_PROCESSORS,
  resolveExtractionSettings,
  type UserExtractionOverrides,
} from '../../qwksearch/extractSettings';
import { requireUserId, UnauthorizedError, unauthorizedResponse } from '../../qwksearch/session';

export const extractionSettingsApp = new Hono();

const handle = async (fn: () => Promise<Response>): Promise<Response> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[qwksearch] extraction settings error:', error);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};

/**
 * The choices the pane renders, resolved from the same constants the chain
 * validates against. Shipping them with the response is what keeps a new
 * citation style or tier from needing a matching edit in the UI.
 */
const fieldOptions = {
  citationStyles: CITATION_STYLES,
  maxTimeoutSeconds: 60,
  minTimeoutSeconds: 1,
  pdfProcessors: PDF_PROCESSORS,
  tiers: DEFAULT_TIER_ORDER,
};

const body = (overrides: UserExtractionOverrides) =>
  Response.json({
    effective: extractionSettingsForClient(
      resolveExtractionSettings(process.env as Record<string, string | undefined>, overrides),
    ),
    options: fieldOptions,
    overrides,
  });

extractionSettingsApp.get('/api/doc/extraction-settings', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    return body(await loadUserExtractionOverrides(userId));
  }),
);

extractionSettingsApp.put('/api/doc/extraction-settings', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);

    // A malformed body is a client bug, not a server error: say so with a 400
    // rather than letting the JSON parse failure become a 500.
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return Response.json({ message: 'Request body must be JSON' }, { status: 400 });
    }

    // Every value is validated on the way in and unrecognised ones are dropped,
    // so the response is the authority on what was actually stored.
    return body(await saveUserExtractionOverrides(userId, payload));
  }),
);

extractionSettingsApp.delete('/api/doc/extraction-settings', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    await clearUserExtractionOverrides(userId);
    return body({});
  }),
);

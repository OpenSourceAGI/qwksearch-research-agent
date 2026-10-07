// POST /api/keywords — the advertiser panel's "Generate keywords with AI".
// Delegates to the package's handler so the demo exercises the same code a
// host app would mount. Without a model key it still answers, with the
// heuristic plan (`source: "heuristic"`).
import { handleAdsRequest } from '../../src/server/index.ts';
import { getComplete } from './llm.js';

export default function handler(request) {
  return handleAdsRequest(request, { complete: getComplete() });
}

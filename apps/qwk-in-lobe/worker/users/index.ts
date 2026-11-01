/**
 * Per-visitor users on the Worker.
 *
 * `installVisitorUsers()` points LobeHub's `getLocalUserId()` at the current
 * request's visitor, so tRPC, `/webapi`, the OpenAPI surface and the QwkSearch
 * routes all run as that browser's own guest user, recorded in D1 and mirrored
 * into Postgres (`@/server/modules/LocalUser`).
 *
 * `LOBE_SHARED_USER=1` (a plain Worker variable) turns it off: every request
 * then runs as the one shared local user again, which is how the data written
 * before per-visitor users existed stays reachable.
 */
import { setRequestUserResolver } from '@/server/modules/LocalUser';

import { getRequestContext } from '../cf/requestContext';
import { isSharedUserMode } from './mode';
import { recordUser } from './store';

export const installVisitorUsers = () => {
  if (isSharedUserMode()) {
    setRequestUserResolver(undefined);
    return;
  }

  setRequestUserResolver(async () => {
    const visitorId = getRequestContext()?.visitorId;
    if (!visitorId) return undefined;

    await recordUser(visitorId);
    return visitorId;
  });
};

export { isSharedUserMode } from './mode';
export { resolveVisitor, withVisitorCookie } from './visitor';

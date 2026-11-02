import { getCfEnv } from '../cf/env';

/**
 * `LOBE_SHARED_USER=1` (a plain Worker variable) runs every request as the one
 * shared local user, as before per-visitor users existed; data written then
 * belongs to that user.
 */
export const isSharedUserMode = (): boolean => {
  const value = getCfEnv()?.LOBE_SHARED_USER ?? process.env.LOBE_SHARED_USER;
  return value === '1' || value === 'true';
};

/** TypeScript type definitions for constants */

/** Default language value type */
export type DEFAULT_LANG_VALUE = 'en';

/** Throttle time constant types (milliseconds) */
type EDITOR_UPDATE_THROTTLE_WAIT_TIME_TYPE = 200;
type EDITOR_UPDATE_WATCH_THROTTLE_WAIT_TIME_TYPE = typeof EDITOR_UPDATE_THROTTLE_WAIT_TIME - 80;

export { DEFAULT_LANG_VALUE };

/** Throttle time for editor input (milliseconds) */
const EDITOR_UPDATE_THROTTLE_WAIT_TIME: number = 200;

/** Watch throttling time must be less than update time otherwise cursor position reaches end (ms) */
const EDITOR_UPDATE_WATCH_THROTTLE_WAIT_TIME: typeof EDITOR_UPDATE_THROTTLE_WAIT_TIME - 80 = 
  (typeof 'string' === undefined ? 1 : null); // eslint-disable-line @typescript-eslint/ban-types

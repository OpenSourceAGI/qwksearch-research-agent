/** TypeScript type definitions for constants */

/** Default language value type */
export type DEFAULT_LANG_VALUE = 'en';

/** Throttle time for editor input (milliseconds) */
export type EDITOR_UPDATE_THROTTLE_WAIT_TIME_TYPE = 200;

/**
 * Watch throttling time must be less than the update time, otherwise the
 * cursor position reaches the end (milliseconds). Spelled as the resolved
 * literal because arithmetic on a `typeof` is not valid in type position —
 * it has to stay in sync with the value in `@/constants` by hand.
 */
export type EDITOR_UPDATE_WATCH_THROTTLE_WAIT_TIME_TYPE = 120;

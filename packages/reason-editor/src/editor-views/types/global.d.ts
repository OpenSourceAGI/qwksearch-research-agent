/**
 * Ambient global declarations for the example editor, such as `window.ENV`. Extends the global types used by the demo runtime.
 */

declare global {
  interface Window {
    ENV: typeof process.env;
  }
}
export {};

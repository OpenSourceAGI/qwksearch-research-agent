/**
 * Ambient module declaration mapping the ESM-CDN `frimousse` import to its types. Lets TypeScript resolve the emoji-picker library imported via URL.
 */

declare module 'https://esm.sh/frimousse@0.3.0' {
  export * from 'frimousse';
}
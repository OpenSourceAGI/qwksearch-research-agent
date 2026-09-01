/**
 * A `Storage` implementation that does nothing, for passing to third-party
 * hooks (e.g. react-split-pane's `usePersistence`) that default their
 * `storage` option to the bare `localStorage` global. That default is
 * evaluated unconditionally wherever the option is omitted, which throws
 * during SSR since `localStorage` doesn't exist there — passing this no-op
 * explicitly on the server sidesteps the library's own default.
 */
const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

/** `window.localStorage` on the client, or a no-op stand-in during SSR. */
export const ssrSafeLocalStorage: Storage =
  typeof window === 'undefined' ? noopStorage : window.localStorage;

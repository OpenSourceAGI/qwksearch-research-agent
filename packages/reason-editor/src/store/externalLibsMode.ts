/**
 * Global toggle controlling how heavy third-party libraries used by editor
 * extensions (KaTeX, Mermaid) are loaded.
 *
 * - 'cdn': lazily fetch them from a public CDN the first time a plugin needs
 *   them (`@/utils/cdn-loader`). Smallest initial bundle, but requires
 *   outbound network access to the CDN at runtime.
 * - 'bundled': import the same libraries from this package's own npm
 *   dependencies instead. Still code-split / loaded on demand, but ships in
 *   the build and works fully offline or behind restrictive firewalls.
 *
 * Draw.io's editor itself is always a remote embed (embed.diagrams.net) —
 * there is no offline alternative for it, so this setting does not affect it.
 */

import { createSignal, getSignal, useSignalValue } from 'reactjs-signal';

export type ExternalLibsMode = 'cdn' | 'bundled';

const externalLibsModeSignal = createSignal<ExternalLibsMode>('cdn');

export function useExternalLibsMode(): ExternalLibsMode {
  return useSignalValue(externalLibsModeSignal);
}

/** Non-reactive read for use outside React components (e.g. cdn-loader.ts). */
export function getExternalLibsMode(): ExternalLibsMode {
  return getSignal(externalLibsModeSignal).value();
}

export const externalLibsModeActions = {
  setMode: (mode: ExternalLibsMode) => {
    getSignal(externalLibsModeSignal).setValue(mode);
  },
};

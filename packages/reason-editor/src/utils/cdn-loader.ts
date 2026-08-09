/**
 * Lazily loads heavy third-party libraries used by editor extensions (KaTeX,
 * Mermaid). By default these are fetched from a public CDN the first time a
 * feature needs them; when `externalLibsMode` is set to 'bundled' (see
 * `@/store/externalLibsMode`) this instead resolves them from the package's
 * own npm dependencies via a code-split dynamic import, so the same
 * `loadKatex()` / `loadMermaid()` callers work offline with no code changes.
 */

import { getExternalLibsMode } from '@/store/externalLibsMode';

const loadedScripts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

export async function loadScript(url: string): Promise<void> {
  if (loadedScripts.has(url)) {
    return Promise.resolve();
  }

  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      loadedScripts.add(url);
      loadingPromises.delete(url);
      resolve();
    };
    script.onerror = () => {
      loadingPromises.delete(url);
      reject(new Error(`Failed to load script: ${url}`));
    };
    document.head.appendChild(script);
  });

  loadingPromises.set(url, promise);
  return promise;
}

export async function loadStylesheet(url: string): Promise<void> {
  if (loadedScripts.has(url)) {
    return Promise.resolve();
  }

  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      loadedScripts.add(url);
      loadingPromises.delete(url);
      resolve();
    };
    link.onerror = () => {
      loadingPromises.delete(url);
      reject(new Error(`Failed to load stylesheet: ${url}`));
    };
    document.head.appendChild(link);
  });

  loadingPromises.set(url, promise);
  return promise;
}

let bundledKatexPromise: Promise<any> | null = null;
let bundledMermaidPromise: Promise<any> | null = null;

export async function loadKatex() {
  if (getExternalLibsMode() === 'bundled') {
    if (!bundledKatexPromise) {
      bundledKatexPromise = Promise.all([
        import('katex'),
        // @ts-ignore - side-effect CSS import, resolved by the bundler
        import('katex/dist/katex.min.css'),
      ]).then(([mod]) => mod.default ?? mod);
    }
    return bundledKatexPromise;
  }

  await Promise.all([
    loadStylesheet('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css'),
    loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js'),
  ]);
  return (window as any).katex;
}

export async function loadMermaid() {
  if (getExternalLibsMode() === 'bundled') {
    if (!bundledMermaidPromise) {
      bundledMermaidPromise = import('mermaid').then((mod) => mod.default ?? mod);
    }
    return bundledMermaidPromise;
  }

  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.12.0/mermaid.min.js');
  return (window as any).mermaid;
}

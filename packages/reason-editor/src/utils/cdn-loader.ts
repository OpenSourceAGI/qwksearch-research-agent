/**
 * Lazily loads external scripts and styles from a CDN at runtime. Used to defer heavy dependencies until a feature actually needs them.
 */

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

export async function loadKatex() {
  await Promise.all([
    loadStylesheet('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css'),
    loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js'),
  ]);
  return (window as any).katex;
}

export async function loadMermaid() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.12.0/mermaid.min.js');
  return (window as any).mermaid;
}

export async function loadDrawio() {
  await loadScript('https://cdn.jsdelivr.net/npm/mxgraph@4.10.38/javascript/mxClient.min.js');
  return (window as any).mxGraph ? { mxGraph: (window as any).mxGraph } : null;
}

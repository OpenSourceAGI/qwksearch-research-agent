/**
 * Minimal stand-in for the `vscode` module. Only the pieces the modules under
 * test reach for are implemented; anything else is intentionally absent so a
 * new dependency on the real API shows up as a loud failure rather than a
 * silently wrong test.
 */

export class Uri {
  private constructor(public readonly path: string) {}

  static file(path: string): Uri {
    return new Uri(path);
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    return new Uri([base.path.replace(/\/$/, ''), ...segments].join('/'));
  }

  toString(): string {
    return this.path;
  }
}

export interface Webview {
  cspSource: string;
  asWebviewUri(uri: Uri): Uri;
}

/** A Webview double whose `asWebviewUri` mirrors the real vscode-resource rewrite. */
export function createWebview(cspSource = 'vscode-webview://test'): Webview {
  return {
    cspSource,
    asWebviewUri: (uri: Uri) => Uri.file(`${cspSource}${uri.toString()}`),
  };
}

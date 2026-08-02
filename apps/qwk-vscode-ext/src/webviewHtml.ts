import * as vscode from "vscode";
import { getNonce } from "./nonce";

/**
 * Renders the shared webview HTML shell for a `dist/main.js` + `dist/main.css`
 * Vite build living under `distUri`. The reason editor's plugin set (images,
 * embedded iframes/video, Mermaid/Katex/Drawio rendering, a WASM-based
 * grammar checker) needs a looser CSP than the chat sidebar:
 *
 * - `script-src` adds `webview.cspSource` alongside the nonce -- several
 *   plugins (Mermaid, Katex, `html-to-docx`) are lazy-loaded via dynamic
 *   `import()`, and the resulting chunk `<script>` tags Vite emits at
 *   runtime don't carry the entry tag's nonce, only same-origin
 *   webview-resource URLs are safe to allow for those.
 * - `'wasm-unsafe-eval'` permits `WebAssembly.instantiate` for that grammar
 *   checker without granting general `'unsafe-eval'`.
 * - `connect-src` adds `webview.cspSource` so `fetch()`-ing a local `.wasm`
 *   asset (served from the same webview-resource origin) isn't blocked.
 */
export function renderEditorWebviewHtml(webview: vscode.Webview, distUri: vscode.Uri, title: string): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "main.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "main.css"));
  const nonce = getNonce();

  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: data: blob:`,
    `media-src ${webview.cspSource} https: data: blob:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}' 'wasm-unsafe-eval' ${webview.cspSource}`,
    `font-src ${webview.cspSource} data:`,
    "frame-src https:",
    `connect-src ${webview.cspSource} https:`,
  ].join("; ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>${title}</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

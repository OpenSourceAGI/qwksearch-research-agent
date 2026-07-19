import type { WebviewApi } from "vscode-webview";

/** Thin, typed wrapper around `acquireVsCodeApi()`, safe to import once. */
class VsCodeApiWrapper {
  private readonly api: WebviewApi<unknown> | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === "function") {
      this.api = acquireVsCodeApi();
    }
  }

  postMessage(message: unknown): void {
    this.api?.postMessage(message);
  }
}

export const vscodeApi = new VsCodeApiWrapper();

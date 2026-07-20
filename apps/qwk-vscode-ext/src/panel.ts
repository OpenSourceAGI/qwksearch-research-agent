import * as vscode from "vscode";
import { AuthManager } from "./auth";
import { streamApiRequest } from "./apiProxy";

interface InboundMessage {
  type: "ready" | "login" | "logout" | "openExternal" | "apiRequest" | "cancelRequest";
  requestId?: string;
  method?: string;
  path?: string;
  body?: unknown;
  url?: string;
}

export class QwkSearchViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "qwksearch.chatView";

  private view?: vscode.WebviewView;
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly auth: AuthManager,
  ) {
    this.auth.onDidChangeAuth((authenticated) => {
      this.post({ type: "authState", authenticated });
    });
  }

  /** Prefills the composer with the given text and reveals the view (used by "Ask About Selection"). */
  askAbout(text: string): void {
    this.post({ type: "prefill", text });
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist")],
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: InboundMessage) =>
      this.handleMessage(message),
    );

    webviewView.onDidDispose(() => {
      for (const controller of this.abortControllers.values()) controller.abort();
      this.abortControllers.clear();
    });
  }

  private async handleMessage(message: InboundMessage): Promise<void> {
    switch (message.type) {
      case "ready": {
        this.post({
          type: "authState",
          authenticated: await this.auth.isAuthenticated(),
        });
        this.post({
          type: "config",
          focusMode: vscode.workspace.getConfiguration("qwksearch").get("focusMode", "all"),
        });
        return;
      }
      case "login": {
        await vscode.commands.executeCommand("qwksearch.login");
        return;
      }
      case "logout": {
        await vscode.commands.executeCommand("qwksearch.logout");
        return;
      }
      case "openExternal": {
        if (message.url) await vscode.env.openExternal(vscode.Uri.parse(message.url));
        return;
      }
      case "cancelRequest": {
        if (message.requestId) this.abortControllers.get(message.requestId)?.abort();
        return;
      }
      case "apiRequest": {
        if (!message.requestId || !message.method || !message.path) return;
        const requestId = message.requestId;
        const apiBaseUrl = vscode.workspace
          .getConfiguration("qwksearch")
          .get<string>("apiBaseUrl", "https://qwksearch.com");
        const apiKey = await this.auth.getApiKey();

        const controller = new AbortController();
        this.abortControllers.set(requestId, controller);

        await streamApiRequest(
          apiBaseUrl,
          apiKey,
          { method: message.method, path: message.path, body: message.body },
          controller.signal,
          {
            onChunk: (chunk) => this.post({ type: "apiChunk", requestId, chunk }),
            onDone: (status) => {
              this.abortControllers.delete(requestId);
              this.post({ type: "apiDone", requestId, status });
            },
            onError: (error) => {
              this.abortControllers.delete(requestId);
              this.post({ type: "apiError", requestId, error });
            },
          },
        );
        return;
      }
    }
  }

  private post(message: unknown): void {
    this.view?.webview.postMessage(message);
  }

  private renderHtml(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist");
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "main.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, "main.css"));
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>QwkSearch Research Agent</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

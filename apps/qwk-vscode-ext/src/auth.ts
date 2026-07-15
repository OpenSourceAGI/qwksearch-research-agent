import * as vscode from "vscode";

const API_KEY_SECRET = "qwksearch.apiKey";
const API_KEY_PATTERN = /^qwk_[a-f0-9]{32}$/i;

/**
 * Owns the user's QwkSearch API key. The key lives only in VS Code's
 * SecretStorage (OS keychain) and in the extension host's memory -- it is
 * never sent to the webview, which only ever talks to the extension host
 * over postMessage.
 */
export class AuthManager {
  private readonly _onDidChangeAuth = new vscode.EventEmitter<boolean>();
  readonly onDidChangeAuth = this._onDidChangeAuth.event;

  constructor(private readonly secrets: vscode.SecretStorage) {
    this.secrets.onDidChange((e) => {
      if (e.key === API_KEY_SECRET) {
        this.getApiKey().then((key) => this._onDidChangeAuth.fire(!!key));
      }
    });
  }

  getApiKey(): Thenable<string | undefined> {
    return this.secrets.get(API_KEY_SECRET);
  }

  async isAuthenticated(): Promise<boolean> {
    return !!(await this.getApiKey());
  }

  private apiBaseUrl(): string {
    return vscode.workspace
      .getConfiguration("qwksearch")
      .get<string>("apiBaseUrl", "https://app.qwksearch.com");
  }

  /**
   * Prompts the user to sign in. QwkSearch's web session is cookie-based, so
   * the extension can't drive an OAuth popup itself -- instead the user signs
   * in on the website (where their personal API key already lives, in
   * Settings -> Account) and pastes that key here.
   */
  async login(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: "$(key) Paste API Key",
          description: "I already have my QwkSearch API key",
          action: "paste" as const,
        },
        {
          label: "$(globe) Open QwkSearch to get a Key",
          description: "Sign in on the web, then copy your key from Settings > Account",
          action: "open" as const,
        },
      ],
      {
        title: "Sign in to QwkSearch",
        placeHolder: "How would you like to sign in?",
      },
    );

    if (!choice) return false;

    if (choice.action === "open") {
      await vscode.env.openExternal(
        vscode.Uri.parse(`${this.apiBaseUrl()}/settings`),
      );
    }

    const apiKey = await vscode.window.showInputBox({
      title: "QwkSearch API Key",
      prompt: "Paste the API key from QwkSearch Settings > Account (starts with qwk_)",
      password: true,
      ignoreFocusOut: true,
      placeHolder: "qwk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      validateInput: (value) => {
        if (!value) return "API key is required";
        if (!API_KEY_PATTERN.test(value.trim())) {
          return "That doesn't look like a QwkSearch API key (expected qwk_...)";
        }
        return undefined;
      },
    });

    if (!apiKey) return false;

    await this.secrets.store(API_KEY_SECRET, apiKey.trim());
    this._onDidChangeAuth.fire(true);
    vscode.window.showInformationMessage("Signed in to QwkSearch.");
    return true;
  }

  async logout(): Promise<void> {
    await this.secrets.delete(API_KEY_SECRET);
    this._onDidChangeAuth.fire(false);
    vscode.window.showInformationMessage("Signed out of QwkSearch.");
  }
}

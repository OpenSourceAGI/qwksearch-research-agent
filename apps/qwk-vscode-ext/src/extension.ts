import * as vscode from "vscode";
import { AuthManager } from "./auth";
import { QwkSearchViewProvider } from "./panel";
import { ReasonMarkdownEditorProvider, ReasonDocxEditorProvider } from "./reasonEditorProvider";

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthManager(context.secrets);
  const provider = new QwkSearchViewProvider(context.extensionUri, auth);

  /** Shared by both reason-editor providers' "Ask QwkSearch" button. */
  const askQwkSearch = async (text: string) => {
    await vscode.commands.executeCommand("qwksearch.chatView.focus");
    provider.askAbout(text);
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(QwkSearchViewProvider.viewType, provider, {
      // Keeps the chat's messages and in-progress composer text alive when the
      // user switches to another sidebar (e.g. Explorer) and back, instead of
      // resetting the webview every time it's hidden.
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.window.registerCustomEditorProvider(
      ReasonMarkdownEditorProvider.viewType,
      new ReasonMarkdownEditorProvider(context.extensionUri, askQwkSearch),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),

    vscode.window.registerCustomEditorProvider(
      ReasonDocxEditorProvider.viewType,
      new ReasonDocxEditorProvider(context.extensionUri, askQwkSearch),
      { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false },
    ),

    vscode.commands.registerCommand("qwksearch.login", () => auth.login()),
    vscode.commands.registerCommand("qwksearch.logout", () => auth.logout()),

    vscode.commands.registerCommand("qwksearch.focus", () =>
      vscode.commands.executeCommand("qwksearch.chatView.focus"),
    ),

    vscode.commands.registerCommand("qwksearch.askSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      const selection = editor?.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showWarningMessage("Select some text first.");
        return;
      }
      await vscode.commands.executeCommand("qwksearch.chatView.focus");
      provider.askAbout(selection);
    }),
  );
}

export function deactivate(): void {}

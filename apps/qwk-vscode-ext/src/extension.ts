import * as vscode from "vscode";
import { AuthManager } from "./auth";
import { QwkSearchViewProvider } from "./panel";

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthManager(context.secrets);
  const provider = new QwkSearchViewProvider(context.extensionUri, auth);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(QwkSearchViewProvider.viewType, provider),

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

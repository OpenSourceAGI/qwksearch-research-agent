import * as vscode from "vscode";
import { renderEditorWebviewHtml } from "./webviewHtml";

/** Message the reason-editor webview sends to the extension host. */
interface EditorOutboundMessage {
  type: "ready" | "change" | "askQwkSearch";
  text?: string;
  base64?: string;
}

/** Forwards a selection/document from the reason editor to the QwkSearch sidebar. */
export type AskQwkSearchHandler = (text: string) => void;

const DIST_PATH = ["webview-ui-editor", "dist"] as const;

function webviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, ...DIST_PATH)],
  };
}

function renderHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const distUri = vscode.Uri.joinPath(extensionUri, ...DIST_PATH);
  return renderEditorWebviewHtml(webview, distUri, "QwkSearch Reason Editor");
}

/**
 * Opens `.md` files in the reason-editor's rich-text surface instead of VS
 * Code's plain text editor. Backed by a real `TextDocument`, so Save, Undo,
 * hot-exit, and external changes (git checkout, another editor) all work the
 * same way they do for any other text file -- we only translate between
 * Markdown source and the HTML the Tiptap-based editor mounts.
 *
 * Round-tripping through the editor's HTML only preserves what its schema
 * can express, so an edited file is re-serialized to Markdown in the
 * editor's own canonical style (headings, list markers, spacing) rather than
 * preserving the original file's exact formatting byte-for-byte outside the
 * lines that changed -- the same tradeoff WYSIWYG Markdown editors like
 * Typora or Obsidian's rich mode make.
 */
export class ReasonMarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = "qwksearch.reasonEditor.markdown";

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onAskQwkSearch: AskQwkSearchHandler,
  ) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): void {
    webviewPanel.webview.options = webviewOptions(this.extensionUri);
    webviewPanel.webview.html = renderHtml(webviewPanel.webview, this.extensionUri);

    let revision = 0;
    // Tracks the text we last sent/received so a save round-trip (our own
    // edit coming back through onDidChangeTextDocument) doesn't get echoed
    // back to the webview as if it were an external change.
    let lastKnownText = document.getText();

    const postInit = () => {
      webviewPanel.webview.postMessage({
        type: "init",
        format: "markdown",
        revision: revision++,
        text: lastKnownText,
      });
    };

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      const text = e.document.getText();
      if (text === lastKnownText) return;
      lastKnownText = text;
      postInit();
    });

    webviewPanel.webview.onDidReceiveMessage((message: EditorOutboundMessage) => {
      switch (message.type) {
        case "ready":
          postInit();
          return;
        case "change":
          if (typeof message.text === "string") {
            lastKnownText = message.text;
            void applyFullTextEdit(document, message.text);
          }
          return;
        case "askQwkSearch":
          if (typeof message.text === "string") this.onAskQwkSearch(message.text);
          return;
      }
    });

    webviewPanel.onDidDispose(() => changeSubscription.dispose());
  }
}

async function applyFullTextEdit(document: vscode.TextDocument, newText: string): Promise<void> {
  if (document.getText() === newText) return;
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
  edit.replace(document.uri, fullRange, newText);
  await vscode.workspace.applyEdit(edit);
}

/**
 * A `.docx` file's bytes, owned for the lifetime of one editor tab. `.docx`
 * is binary, so unlike the Markdown provider this can't ride VS Code's
 * `TextDocument` machinery -- edits are tracked as whole-buffer snapshots
 * (`update`) and Undo/Redo across saves is left to the editor's own
 * (Tiptap) history rather than reimplemented as VS Code edit stack entries.
 */
class ReasonDocxDocument implements vscode.CustomDocument {
  private _bytes: Uint8Array;
  private _revision = 0;

  private readonly _onDidChangeContent = new vscode.EventEmitter<void>();
  readonly onDidChangeContent = this._onDidChangeContent.event;

  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  readonly onDidDispose = this._onDidDispose.event;

  private constructor(
    readonly uri: vscode.Uri,
    bytes: Uint8Array,
  ) {
    this._bytes = bytes;
  }

  static async create(uri: vscode.Uri, backupId: string | undefined): Promise<ReasonDocxDocument> {
    const source = backupId ? vscode.Uri.parse(backupId) : uri;
    const bytes = await vscode.workspace.fs.readFile(source);
    return new ReasonDocxDocument(uri, bytes);
  }

  get bytes(): Uint8Array {
    return this._bytes;
  }

  get revision(): number {
    return this._revision;
  }

  /** Called when the webview reports an edit; marks the VS Code tab dirty. */
  update(bytes: Uint8Array): void {
    this._bytes = bytes;
    this._revision++;
    this._onDidChangeContent.fire();
  }

  /** Reloads bytes from disk for "Revert File"; does not mark the tab dirty. */
  async reload(): Promise<void> {
    this._bytes = await vscode.workspace.fs.readFile(this.uri);
    this._revision++;
  }

  dispose(): void {
    this._onDidDispose.fire();
    this._onDidChangeContent.dispose();
    this._onDidDispose.dispose();
  }
}

/**
 * Opens `.docx` files in the reason-editor's rich-text surface. Uses the
 * binary `CustomEditorProvider` API (there's no `TextDocument` for a Word
 * file), converting to/from HTML with `mammoth` (read) and `html-to-docx`
 * (write) inside the webview -- see `webview-ui-editor/src/docx.ts`.
 */
export class ReasonDocxEditorProvider implements vscode.CustomEditorProvider<ReasonDocxDocument> {
  static readonly viewType = "qwksearch.reasonEditor.docx";

  private readonly _onDidChangeCustomDocument =
    new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<ReasonDocxDocument>>();
  readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  /** Open panels per document, so an explicit "Revert File" can push fresh bytes to all of them. */
  private readonly panelsByUri = new Map<string, Set<vscode.WebviewPanel>>();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onAskQwkSearch: AskQwkSearchHandler,
  ) {}

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
  ): Promise<ReasonDocxDocument> {
    const document = await ReasonDocxDocument.create(uri, openContext.backupId);
    const changeSubscription = document.onDidChangeContent(() => {
      this._onDidChangeCustomDocument.fire({ document });
    });
    document.onDidDispose(() => changeSubscription.dispose());
    return document;
  }

  resolveCustomEditor(document: ReasonDocxDocument, webviewPanel: vscode.WebviewPanel): void {
    webviewPanel.webview.options = webviewOptions(this.extensionUri);
    webviewPanel.webview.html = renderHtml(webviewPanel.webview, this.extensionUri);

    const key = document.uri.toString();
    let panels = this.panelsByUri.get(key);
    if (!panels) {
      panels = new Set();
      this.panelsByUri.set(key, panels);
    }
    panels.add(webviewPanel);

    const postInit = () => {
      webviewPanel.webview.postMessage({
        type: "init",
        format: "docx",
        revision: document.revision,
        base64: Buffer.from(document.bytes).toString("base64"),
      });
    };

    webviewPanel.webview.onDidReceiveMessage((message: EditorOutboundMessage) => {
      switch (message.type) {
        case "ready":
          postInit();
          return;
        case "change":
          if (typeof message.base64 === "string") {
            document.update(Buffer.from(message.base64, "base64"));
          }
          return;
        case "askQwkSearch":
          if (typeof message.text === "string") this.onAskQwkSearch(message.text);
          return;
      }
    });

    webviewPanel.onDidDispose(() => {
      panels!.delete(webviewPanel);
      if (panels!.size === 0) this.panelsByUri.delete(key);
    });
  }

  async saveCustomDocument(document: ReasonDocxDocument): Promise<void> {
    await vscode.workspace.fs.writeFile(document.uri, document.bytes);
  }

  async saveCustomDocumentAs(document: ReasonDocxDocument, destination: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.writeFile(destination, document.bytes);
  }

  async revertCustomDocument(document: ReasonDocxDocument): Promise<void> {
    await document.reload();
    for (const panel of this.panelsByUri.get(document.uri.toString()) ?? []) {
      panel.webview.postMessage({
        type: "init",
        format: "docx",
        revision: document.revision,
        base64: Buffer.from(document.bytes).toString("base64"),
      });
    }
  }

  async backupCustomDocument(
    document: ReasonDocxDocument,
    context: vscode.CustomDocumentBackupContext,
  ): Promise<vscode.CustomDocumentBackup> {
    await vscode.workspace.fs.writeFile(context.destination, document.bytes);
    return {
      id: context.destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(context.destination);
        } catch {
          // Already gone -- nothing to clean up.
        }
      },
    };
  }
}

/** Message protocol shared with the extension host (src/reasonEditorProvider.ts). */

export type DocFormat = "markdown" | "docx";

export type OutboundMessage =
  | { type: "ready" }
  /** Edited content, pushed after every debounced change. Exactly one of
   *  `text` (markdown source) / `base64` (raw .docx bytes) is set, matching
   *  the document's format. */
  | { type: "change"; text?: string; base64?: string }
  | { type: "askQwkSearch"; text: string };

export type InboundMessage =
  /** Sent once on load, and again whenever the underlying file changes on
   *  disk outside the editor (revert, external edit, undo past our own
   *  edits) — `revision` lets the webview tell "new document" from "a
   *  message that echoes what it just sent". */
  | { type: "init"; format: DocFormat; revision: number; text?: string; base64?: string };

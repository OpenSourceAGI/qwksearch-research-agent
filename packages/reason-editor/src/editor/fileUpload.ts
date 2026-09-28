/**
 * @module fileUpload
 * @description Helpers for turning a browser `File` chosen in the file
 * manager into the stored document body, and for minting the document IDs
 * those files are saved under.
 */
import type { Document } from "react-reason-editor-sidebar";

/**
 * Mints an ID for a new document. IDs come from the clock, so two creations
 * in the same millisecond (uploading several files at once) would collide;
 * this walks forward until it finds an ID no existing document is using.
 */
export function nextDocumentId(existing: Document[] = []): string {
  const taken = new Set(existing.map((doc) => doc.id));
  let id = Date.now().toString();
  while (taken.has(id)) id = (Number(id) + 1).toString();
  return id;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text is stored as blank-line-separated paragraphs, matching the editor's own shape. */
function textToHtml(text: string): string {
  return text
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

const TEXT_FILE = /\.(txt|md|markdown|csv|json|ya?ml|html?|css|[jt]sx?)$/i;

/** Whether an upload can be shown as text in the editor, rather than as a placeholder. */
export function isTextFile(file: File): boolean {
  return file.type.startsWith("text/") || TEXT_FILE.test(file.name);
}

/**
 * Reads an uploaded file into the document body.
 *
 * Text-like files become escaped paragraphs. Binary files (images, PDFs, and
 * anything else the editor cannot render) become a short note recording the
 * file's name and size, so the upload is still visible and traceable.
 */
export async function readUploadedFile(file: File): Promise<string> {
  if (!isTextFile(file)) {
    return `<p>${escapeHtml(file.name)} (${file.size} bytes)</p>`;
  }
  try {
    return textToHtml(await file.text());
  } catch {
    // An unreadable file (permissions, a revoked blob URL) still deserves a
    // row in the tree rather than an empty note.
    return `<p>${escapeHtml(file.name)} (${file.size} bytes)</p>`;
  }
}

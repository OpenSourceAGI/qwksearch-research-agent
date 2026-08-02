import mammoth from "mammoth";

/** Renders a .docx file's bytes (base64-encoded over the postMessage bridge) to HTML. */
export async function docxBase64ToHtml(base64: string): Promise<string> {
  if (!base64) return "";
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  return value;
}

/**
 * Serializes the editor's current HTML to a .docx file, returned as base64
 * so it can cross the postMessage bridge back to the extension host.
 *
 * Round-tripping through Tiptap's HTML only preserves what its schema can
 * express (text formatting, headings, lists, tables, images) — layout-level
 * Word features (page headers/footers, tracked changes, custom styles) in
 * the original file are not read back out on save. That mirrors the
 * `ExportWord` extension this reuses (react-reason-editor's `html-to-docx`
 * based export), which has the same limitation.
 */
export async function htmlToDocxBase64(html: string): Promise<string> {
  const { default: htmlToDocx } = await import("html-to-docx");
  const buffer = await htmlToDocx(html, undefined, {});
  return arrayBufferToBase64(buffer as ArrayBuffer);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

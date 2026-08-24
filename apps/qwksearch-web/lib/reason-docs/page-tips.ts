/**
 * @fileoverview Client helpers for the REASON editor's AI "page tips" feature.
 */
import grab from "grab-url";

/**
 * Strips HTML markup (including `<script>`/`<style>` element content) and
 * collapses whitespace, leaving plain readable text suitable for an LLM
 * prompt. Document content in the editor is stored as HTML.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetches short AI-generated tips about a document's content. Returns an empty array on any failure. */
export const getPageTips = async (title: string, content: string): Promise<string[]> => {
  try {
    const data = await grab<{ tips: string[] }>("agent/page-tips", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });

    return Array.isArray(data.tips) ? data.tips : [];
  } catch (e) {
    return [];
  }
};

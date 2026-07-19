/**
 * @module rewrite
 * @description Utility functions for converting Markdown to HTML and
 * calling the backend AI rewrite endpoint.
 */
import { marked } from "marked";
import grab from "grab-url";

/**
 * Converts a Markdown string to an HTML string using the `marked` library.
 * Line breaks are converted to `<br>` tags and GitHub Flavored Markdown is enabled.
 *
 * @param markdown - Raw Markdown input.
 * @returns Trimmed HTML string.
 */
export function markdownToHtml(markdown: string): string {
  // Configure marked to be safer and handle inline elements better
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  const html = marked.parse(markdown) as string;
  return html.trim();
}

/**
 * Sends `text` to the backend AI rewrite endpoint (`/api/agent/ai/rewrite`)
 * and returns the rewritten text. An optional `customPrompt` overrides the
 * default rewrite instruction on the server.
 *
 * @param text - The source text to rewrite.
 * @param customPrompt - Optional custom instruction to guide the rewrite.
 * @returns The AI-generated replacement text.
 * @throws When the API response is not OK.
 */
export async function rewriteText(
  text: string,
  customPrompt?: string,
): Promise<string> {
  try {
    const data = await grab("/api/agent/ai/rewrite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: { text, prompt: customPrompt },
    });

    return data.rewrittenText;
  } catch (error: any) {
    const errorData = await error.response
      ?.json()
      .catch(() => ({ error: "Failed to rewrite text" }));
    throw new Error(errorData?.error || "Failed to rewrite text");
  }
}

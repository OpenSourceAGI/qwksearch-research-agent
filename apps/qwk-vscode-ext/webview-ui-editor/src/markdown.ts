import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
turndownService.use(gfm);

/** Renders Markdown source to the HTML the Tiptap editor mounts as content. */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return "";
  return marked.parse(markdown, { gfm: true, breaks: false }) as string;
}

/** Serializes the editor's current HTML back to Markdown for saving to disk. */
export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return "";
  return turndownService.turndown(html).trim() + "\n";
}

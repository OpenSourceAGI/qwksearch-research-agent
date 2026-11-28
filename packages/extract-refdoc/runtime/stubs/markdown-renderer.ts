/**
 * Stands in for `fumadocs-core/content/md` in the runtime bundle. Fumadocs'
 * search list renders string results as Markdown (remark + rehype-raw, about
 * 250 KB); refdoc passes React nodes, which skip that path, so the parser
 * never runs and is left out.
 */
import type { ReactNode } from "react"

export function createMarkdownRenderer() {
  return { Markdown: ({ children }: { children?: ReactNode }) => children ?? null }
}

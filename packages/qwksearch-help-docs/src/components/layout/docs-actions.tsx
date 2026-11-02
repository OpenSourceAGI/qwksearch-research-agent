/**
 * @file docs-actions.tsx
 * @description The row of per-page actions under a doc's title: copy the page
 * as Markdown for an LLM, or open it in an AI assistant / on GitHub.
 */
'use client';

import { AskAIDropdown } from '../ai/ask-ai-dropdown';
import { LLMCopyButton } from '../ai/llm-copy-button';

export function DocsActions({
  /** URL serving this page's raw Markdown, e.g. `/docs/llms.mdx/docs/features`. */
  markdownUrl,
  /** URL of this page's source file on GitHub. */
  githubUrl,
}: {
  markdownUrl: string;
  githubUrl?: string;
}) {
  return (
    <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
      <LLMCopyButton markdownUrl={markdownUrl} />
      <AskAIDropdown markdownUrl={markdownUrl} githubUrl={githubUrl} />
    </div>
  );
}

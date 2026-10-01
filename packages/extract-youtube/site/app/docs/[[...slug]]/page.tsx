/**
 * @file page.tsx
 * @description Renders one docs page. The MDX body is a module compiled at
 * build time by `fumadocs-mdx/vite`.
 *
 * There is deliberately no `getGithubLastEdit` here: it calls the GitHub API
 * on every render, and an unauthenticated Worker hits GitHub's 60-requests-
 * per-hour limit almost immediately.
 */
import { source } from '@/lib/fumadocs/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMDXComponents } from '@/mdx-components';
import { AskAIDropdown } from '@/components/fumadocs/ai/ask-ai-dropdown';
import { LLMCopyButton } from '@/components/fumadocs/ai/llm-copy-button';
import { Breadcrumb } from '@/components/fumadocs/layout/breadcrumb';
import { docsConfig } from '@/lib/fumadocs/customize-docs';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <Breadcrumb tree={source.pageTree} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
        <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
        <AskAIDropdown markdownUrl={`${page.url}.mdx`} githubUrl={`${docsConfig.githubDocs}/${page.path}`} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: `${page.data.title} | ${docsConfig.title}`,
    description: page.data.description,
  };
}

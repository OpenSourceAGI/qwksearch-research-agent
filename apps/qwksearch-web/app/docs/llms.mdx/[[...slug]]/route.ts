/**
 * @fileoverview A single help doc as raw Markdown, backing the "Copy" and
 * "Ask AI" actions on each page.
 */
import { notFound } from 'next/navigation';
import { source } from 'qwksearch-help-docs';
import { getLLMText, getMarkdownParams, parseMarkdownSlug } from 'qwksearch-help-docs/llms';

export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(parseMarkdownSlug(slug));
  if (!page) notFound();

  return new Response(getLLMText(page), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function generateStaticParams() {
  return getMarkdownParams();
}

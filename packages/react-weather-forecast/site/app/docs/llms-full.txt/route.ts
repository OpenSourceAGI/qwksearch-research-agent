/**
 * @file route.ts
 * @description Every docs page as one plain-text Markdown file, for LLMs.
 */
import { getLLMText, source } from '@/lib/fumadocs/source';

export const revalidate = false;

export async function GET() {
  const scanned = await Promise.all(source.getPages().map(getLLMText));

  return new Response(scanned.join('\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

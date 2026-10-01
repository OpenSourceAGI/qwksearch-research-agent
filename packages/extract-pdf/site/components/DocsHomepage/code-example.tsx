/**
 * @file code-example.tsx
 * @description Tabbed code samples for the landing page. Plain (unhighlighted)
 * code blocks: highlighting here would mean running Shiki in the Worker at
 * request time, which is not worth it for four snippets.
 */
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

const examples: { label: string; code: string }[] = [
  {
    label: 'PDF',
    code: `import { convertPDFToHTML } from 'extract-pdf';

const { html, title, author, ocrScan } = await convertPDFToHTML('https://arxiv.org/pdf/1706.03762', {
  addPageNumbers: true,
});

console.log(title, author);
console.log(ocrScan.pagesNeedingOcr); // e.g. [3, 7]: pages with tables or figures`,
  },
  {
    label: 'PDF + OCR',
    code: `import { convertPDFToHTML } from 'extract-pdf';

// Fast text layer everywhere; only flagged pages go to a Docling processor.
const { html } = await convertPDFToHTML(buffer, {
  processor: 'hybrid',
  processorUrl: 'https://YOUR_HF_USERNAME-extract-pdf-docling.hf.space',
  doclingOptions: { processorHeaders: { 'X-Docling-Token': process.env.DOCLING_API_TOKEN } },
});`,
  },
  {
    label: 'Webpage',
    code: `import { extractContent } from 'extract-webpage';

const article = await extractContent('https://en.wikipedia.org/wiki/Web_scraping');

article.title;      // "Web scraping"
article.cite;       // APA-style citation
article.html;       // the main content as basic HTML
article.word_count;`,
  },
  {
    label: 'Worker',
    code: `// A PDF endpoint on Cloudflare Workers, as the live demo does it.
import { convertPDFToHTML } from 'extract-pdf';

export default {
  async fetch(request: Request) {
    const url = new URL(request.url).searchParams.get('url');
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });
    const pdf = await (await fetch(url)).arrayBuffer();
    const { html, title, ocrScan } = await convertPDFToHTML(pdf);
    return Response.json({ title, html, pagesNeedingOcr: ocrScan?.pagesNeedingOcr });
  },
};`,
  },
];

export function CodeExample() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            A few lines, <span className="text-primary">anywhere</span>
          </h2>
          <p className="text-lg text-muted-foreground">The same calls in a script, a server or a Worker.</p>
        </div>

        <Tabs items={examples.map((e) => e.label)}>
          {examples.map((example) => (
            <Tab key={example.label} value={example.label}>
              <CodeBlock>
                <Pre>
                  <code>{example.code}</code>
                </Pre>
              </CodeBlock>
            </Tab>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

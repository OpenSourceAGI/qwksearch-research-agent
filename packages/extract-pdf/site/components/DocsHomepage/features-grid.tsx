/**
 * @file features-grid.tsx
 * @description What the two packages do, grouped the way the docs sidebar is.
 */
import {
  BookMarked,
  Cloud,
  FileText,
  Gauge,
  Globe,
  Layers,
  type LucideIcon,
  ScanText,
  Quote,
  Rows3,
} from 'lucide-react';
import Link from 'next/link';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

const featureCategories: { category: string; tagline: string; features: Feature[] }[] = [
  {
    category: 'extract-pdf',
    tagline: 'A PDF (URL or ArrayBuffer) to structured HTML, with no PDF engine bundled.',
    features: [
      {
        icon: Gauge,
        title: 'Instant text layer',
        description:
          'Headings by font size, lists, footnotes, code and quote blocks, and Table of Contents links, from the text layer in milliseconds.',
        href: '/docs/pdf',
      },
      {
        icon: ScanText,
        title: 'OCR only where needed',
        description:
          'A regex scan flags scanned pages, tables and figures; only those go through Granite Docling, in-process or on a remote processor.',
        href: '/docs/pdf/ocr',
      },
      {
        icon: Layers,
        title: 'Three parse methods',
        description: 'The pure-TS block algorithm everywhere, or LiteParse natively in Node or as WASM in browsers and Workers.',
        href: '/docs/pdf/parse-methods',
      },
      {
        icon: Cloud,
        title: 'Runs on Workers',
        description: 'PDF.js comes from pdfjs-serverless at runtime. Node-only engines stay out of the bundle.',
        href: '/docs/pdf/workers',
      },
    ],
  },
  {
    category: 'extract-webpage',
    tagline: 'Any URL to its main content and a citation, plus the text tools a research agent needs.',
    features: [
      {
        icon: FileText,
        title: 'Main content',
        description:
          'Readability and Mercury run side by side and the longer article wins, simplified to headings, paragraphs, images and links.',
        href: '/docs/webpage',
      },
      {
        icon: Quote,
        title: 'Citations',
        description:
          'Author, date, title and publisher from meta tags and class names, with author names checked against 90,000 human names.',
        href: '/docs/webpage/cite',
      },
      {
        icon: Globe,
        title: 'PDFs, DOCX and YouTube too',
        description: 'A PDF URL goes through extract-pdf, a YouTube URL through extract-youtube, and a DOCX buffer through JSZip.',
        href: '/docs/webpage',
      },
      {
        icon: BookMarked,
        title: 'Scraping with fallbacks',
        description: 'fetch first, then a Cloudflare Puppeteer scraper, then Jina Reader, with bot-detection checks and robots.txt rules.',
        href: '/docs/webpage/scrape',
      },
      {
        icon: Rows3,
        title: 'Sentences, chunks and keyphrases',
        description: 'Sentence splitting that knows abbreviations, semantic chunks for LLMs, stemming, and SEEKTOPIC keyphrases.',
        href: '/docs/webpage/text-tools',
      },
    ],
  },
];

export function FeaturesGrid() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            From a link or a file to <span className="text-primary">readable text</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Answer at once from the text layer, cite what you read, and spend OCR only on the pages that need it.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {featureCategories.map((group) => (
            <div key={group.category}>
              <div className="mb-6">
                <h3 className="text-xl font-semibold">{group.category}</h3>
                <p className="text-muted-foreground">{group.tagline}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.features.map((feature) => (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
                  >
                    <feature.icon className="mb-4 h-6 w-6 text-primary" />
                    <h4 className="mb-2 font-semibold group-hover:text-primary">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

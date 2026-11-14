import { BookOpen, Database, Globe, Search, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_URL, GITHUB_URL, NPM_URL } from '@/lib/fumadocs/customize-docs';
import { cn } from '@/lib/utils';
import { getTopDomains, getTotalDomains } from 'domain-rank';

const FEATURES = [
  { icon: Database, title: 'Bundled offline dataset', body: 'Merged Tranco and CommonCrawl domain ranks ship with the package, so lookups work without network calls.' },
  { icon: Search, title: 'Fast lookup & search', body: 'Use lookupDomain, searchDomains, and getTopDomains to resolve names, ranks, and metadata in-memory.' },
  { icon: Globe, title: 'Readable source labels', body: 'Format hostnames into human-friendly titles and resolve favicons for UI autocomplete and result lists.' },
  { icon: ShieldCheck, title: 'Typed and predictable', body: 'TypeScript types, tree-shakeable ESM/CJS builds, and pure data utilities for Node, Bun, and edge runtimes.' },
  { icon: Zap, title: 'No API key', body: 'Domain rank data is local and queryable instantly, useful for scoring, suggestions, and reputation hints.' },
  { icon: BookOpen, title: 'Docs + sample listings', body: 'Explore usage docs and a live demo with sample top domains pulled from the bundled dataset.' },
];

const CODE = `import { lookupDomain, getTopDomains } from 'domain-rank';

const domain = lookupDomain('github.com');
const top = getTopDomains(10);`;

export default function Home() {
  const total = getTotalDomains();
  const sample = getTopDomains(8);

  return (
    <main className="min-h-screen">
      <section className="container mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
        <div>
          <a href={NPM_URL} className="mb-4 inline-block rounded-full border border-fd-border px-3 py-1 font-mono text-xs text-fd-muted-foreground">
            npm install domain-rank
          </a>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Top domain ranks, <span className="text-fd-primary">offline</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg text-fd-muted-foreground">
            Look up source names, influence ranks, and favicons from a bundled Tranco + CommonCrawl dataset. No API key, no remote dependency.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={DEMO_URL} className={cn(buttonVariants({ size: 'lg' }))}>
              Live demo
            </Link>
            <Link href="/docs" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Docs
            </Link>
            <a href={GITHUB_URL} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              GitHub
            </a>
          </div>
          <p className="mt-4 text-sm text-fd-muted-foreground">{total.toLocaleString()} domains bundled locally.</p>
        </div>
        <div className="rounded-xl border border-fd-border bg-fd-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fd-muted-foreground">Sample top domains</h2>
          <ol className="space-y-2">
            {sample.map((d) => (
              <li key={d.domain} className="flex items-center justify-between gap-3 rounded-md border border-fd-border/60 px-3 py-2 text-sm">
                <span className="font-medium">{d.name || d.domain}</span>
                <span className="font-mono text-xs text-fd-muted-foreground">#{d.rank} · {d.domain}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-fd-border bg-fd-card p-5">
              <Icon className="mb-3 size-5 text-fd-primary" />
              <h2 className="mb-1 font-semibold">{title}</h2>
              <p className="text-sm text-fd-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 pb-20">
        <pre className="overflow-x-auto rounded-xl border border-fd-border bg-fd-card p-5 text-sm">
          <code>{CODE}</code>
        </pre>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import { DomainRankDemo } from '@/components/demo/DomainRankDemo';

export const metadata: Metadata = {
  title: 'Live demo | domain-rank',
  description: 'Search and inspect sample top domains from the bundled domain-rank dataset.',
};

export default function DemoPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Live demo</h1>
      <p className="mb-8 max-w-2xl text-fd-muted-foreground">
        Query the bundled offline dataset: search by domain or source name and browse sample top-ranked domains.
      </p>
      <DomainRankDemo />
    </main>
  );
}

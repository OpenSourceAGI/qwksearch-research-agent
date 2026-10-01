/**
 * @file page.tsx
 * @description Landing page for the extract-youtube docs.
 */
import { CodeExample } from '@/components/DocsHomepage/code-example';
import { ComparisonTable } from '@/components/DocsHomepage/comparison-table';
import { FeaturesGrid } from '@/components/DocsHomepage/features-grid';
import { Footer } from '@/components/DocsHomepage/footer';
import { HeroSection } from '@/components/DocsHomepage/hero-section';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <FeaturesGrid />
      <CodeExample />
      <ComparisonTable />
      <Footer />
    </main>
  );
}

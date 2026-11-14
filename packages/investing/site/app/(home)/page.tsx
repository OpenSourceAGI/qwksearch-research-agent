/**
 * @file page.tsx
 * @description Landing page for the investing docs. Sections follow the
 * git0.js.org homepage: hero with install tabs, module grid, tabbed code
 * examples, closing call to action.
 */
import { CodeExample } from '@/components/DocsHomepage/code-example';
import { FeaturesGrid } from '@/components/DocsHomepage/features-grid';
import { Footer } from '@/components/DocsHomepage/footer';
import { HeroSection } from '@/components/DocsHomepage/hero-section';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesGrid />
      <CodeExample />
      <Footer />
    </main>
  );
}

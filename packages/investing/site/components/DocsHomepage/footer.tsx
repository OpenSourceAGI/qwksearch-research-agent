/**
 * @file footer.tsx
 * @description Closing call to action on the landing page.
 */
import { BookOpen, FlaskConical, Package } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { GithubIcon } from '@/components/ui/github-icon';
import { NPM_URL, PACKAGE_GITHUB_URL, PLAYGROUND_URL } from '@/lib/fumadocs/customize-docs';
import { cn } from '@/lib/utils';

export function Footer() {
  return (
    <footer className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="mb-6 text-balance text-3xl font-bold md:text-5xl">
          From a ticker or a market URL to a <span className="text-fd-primary">decision</span>
        </h2>
        <p className="mb-8 text-xl text-fd-muted-foreground">Data, analysis and execution in one typed package.</p>

        <div className="mb-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/docs/getting-started" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
            <BookOpen className="size-4" />
            Get started
          </Link>
          <Link href={PLAYGROUND_URL} className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'gap-2')}>
            <FlaskConical className="size-4" />
            Playground
          </Link>
          <a href={NPM_URL} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'gap-2')}>
            <Package className="size-4" />
            npm
          </a>
          <a href={PACKAGE_GITHUB_URL} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'gap-2')}>
            <GithubIcon className="size-4" />
            Source
          </a>
        </div>

        <div className="border-t pt-8 text-sm text-fd-muted-foreground">
          <p>
            Nothing on this site is financial advice. Examples that place orders default to paper trading; read the code before
            pointing them at a funded account.
          </p>
          <p className="mt-2">
            The PredictOS module is adapted from{' '}
            <a href="https://github.com/PredictionXBT/PredictOS" className="text-fd-primary hover:underline">
              PredictOS
            </a>{' '}
            by PredictionXBT (MIT). Made by{' '}
            <a href="https://github.com/vtempest" className="text-fd-primary hover:underline">
              vtempest
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

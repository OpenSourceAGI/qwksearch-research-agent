/**
 * @file footer.tsx
 * @description Closing call-to-action on the landing page.
 */
import { BookOpen, ExternalLink, LayoutGrid } from 'lucide-react';
import { GithubIcon } from '@/components/ui/github-icon';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_URL, GITHUB_URL, STORYBOOK_URL } from '@/lib/fumadocs/customize-docs';
import { cn } from '@/lib/utils';

export function Footer() {
  return (
    <footer className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-balance md:text-4xl">
            From video ID to transcript in <span className="text-primary">one call</span>
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Read the docs, try the components in the live demo, or browse them one by one in Storybook.
          </p>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/docs" className={cn(buttonVariants({ size: 'lg' }))}>
              <BookOpen className="h-4 w-4" />
              Read the docs
            </Link>
            <a href={DEMO_URL} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <LayoutGrid className="h-4 w-4" />
              Live demo
            </a>
            <a href={STORYBOOK_URL} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <ExternalLink className="h-4 w-4" />
              Storybook
            </a>
            <a href={GITHUB_URL} className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }))}>
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
          </div>

          <div className="border-t border-border pt-8 text-sm text-muted-foreground">
            extract-youtube is part of the{' '}
            <a className="underline hover:text-foreground" href={GITHUB_URL}>
              qwksearch-research-agent
            </a>{' '}
            monorepo. Licensed under rights.institute/PROSPER.
          </div>
        </div>
      </div>
    </footer>
  );
}

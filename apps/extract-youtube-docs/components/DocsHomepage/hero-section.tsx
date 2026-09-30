/**
 * @file hero-section.tsx
 * @description Hero for the landing page: tagline, install command, links.
 */
'use client';

import { BookOpen, Check, Copy, LayoutGrid } from 'lucide-react';
import { GithubIcon } from '@/components/ui/github-icon';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_URL, GITHUB_URL, NPM_URL } from '@/lib/fumadocs/customize-docs';
import { cn } from '@/lib/utils';

const INSTALL = 'npm i extract-youtube';

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    void navigator.clipboard.writeText(INSTALL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-bg absolute inset-0" />
      <div className="grid-glow absolute inset-0" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 border-primary/30 px-4 py-1.5 text-primary">
            No browser · No API key · Cloudflare Workers ready
          </Badge>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-6xl">
            YouTube transcripts, <span className="shimmer-text">without a browser</span>
          </h1>

          <p className="mb-8 max-w-2xl text-lg text-pretty text-muted-foreground md:text-xl">
            A TypeScript transcript extractor that runs anywhere <code>fetch</code> does — Node, Bun, Lambda,
            Vercel Edge, Cloudflare Workers — plus a CLI, proxy support, six output formats, and React
            components for a floating player, synced transcripts and video grids.
          </p>

          <div className="mb-8 flex flex-wrap justify-center gap-2">
            <a href={NPM_URL} target="_blank" rel="noreferrer">
              <img alt="npm version" src="https://img.shields.io/npm/v/extract-youtube.svg" />
            </a>
            <a href={NPM_URL} target="_blank" rel="noreferrer">
              <img alt="npm downloads" src="https://img.shields.io/npm/dm/extract-youtube.svg" />
            </a>
            <a href={NPM_URL} target="_blank" rel="noreferrer">
              <img alt="TypeScript types" src="https://img.shields.io/npm/types/extract-youtube" />
            </a>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link href="/docs" className={cn(buttonVariants({ size: 'lg' }))}>
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>

            <button
              type="button"
              onClick={copyCommand}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 transition-colors hover:border-primary/50"
              aria-label={`Copy "${INSTALL}"`}
            >
              <code className="font-mono text-sm text-foreground">{INSTALL}</code>
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              )}
            </button>

            <a href={DEMO_URL} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <LayoutGrid className="h-4 w-4" />
              Live demo
            </a>

            <a href={GITHUB_URL} className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }))}>
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

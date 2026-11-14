/**
 * @file hero-section.tsx
 * @description Landing-page hero: tagline, npm badges, install command tabs
 * and the two calls to action. Layout adapted from the git0.js.org homepage.
 */
'use client';

import { BookOpen, Check, Copy, FlaskConical, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { GithubIcon } from '@/components/ui/github-icon';
import { NPM_URL, PACKAGE_GITHUB_URL, PLAYGROUND_URL } from '@/lib/fumadocs/customize-docs';
import { cn } from '@/lib/utils';

const installCommands = {
  npm: 'npm install investing',
  bun: 'bun add investing',
  pnpm: 'pnpm add investing',
};

type InstallTab = keyof typeof installCommands;

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<InstallTab>('npm');
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    void navigator.clipboard?.writeText(installCommands[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden border-b">
      <div className="grid-bg absolute inset-0" aria-hidden />
      <div className="grid-glow absolute inset-0" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fd-background/40 to-fd-background" aria-hidden />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-14 text-center md:pt-20">
        <Badge variant="outline" className="mb-6 gap-2 border-fd-primary/30 px-4 py-1.5 text-fd-primary">
          <Sparkles className="size-4" />
          Stocks · Trading agents · Prediction markets
        </Badge>

        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl">
          <span className="shimmer-text">investing</span>
        </h1>

        <p className="mb-6 max-w-3xl text-pretty text-lg text-fd-muted-foreground md:text-2xl">
          One TypeScript package for market data, brokerage and research agents:{' '}
          <span className="font-semibold text-fd-primary">
            quotes with automatic fallback, Polymarket and Kalshi analysis, cross-venue arbitrage and AI trading debates
          </span>
          .
        </p>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            <img alt="npm version" src="https://img.shields.io/npm/v/investing.svg" />
          </a>
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            <img alt="npm monthly downloads" src="https://img.shields.io/npm/dm/investing.svg" />
          </a>
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            <img alt="TypeScript types" src="https://img.shields.io/npm/types/investing" />
          </a>
          <a href={PACKAGE_GITHUB_URL} target="_blank" rel="noreferrer">
            <img alt="GitHub stars" src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" />
          </a>
        </div>

        <div className="mb-8 flex w-full max-w-xl flex-col items-center gap-3">
          <div className="flex gap-1 rounded-lg border bg-fd-card p-1" role="tablist" aria-label="Package manager">
            {(Object.keys(installCommands) as InstallTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors',
                  activeTab === tab
                    ? 'bg-fd-primary text-fd-primary-foreground'
                    : 'text-fd-muted-foreground hover:bg-fd-secondary hover:text-fd-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copyCommand}
            className="group flex w-full items-center justify-between gap-3 rounded-lg border bg-fd-card px-4 py-3 text-left transition-colors hover:border-fd-primary/50"
            aria-label={`Copy "${installCommands[activeTab]}"`}
          >
            <code className="font-mono text-base">{installCommands[activeTab]}</code>
            {copied ? (
              <Check className="size-4 text-fd-primary" />
            ) : (
              <Copy className="size-4 text-fd-muted-foreground transition-colors group-hover:text-fd-primary" />
            )}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/docs" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
            <BookOpen className="size-4" />
            Read the docs
          </Link>
          <Link href={PLAYGROUND_URL} className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'gap-2')}>
            <FlaskConical className="size-4" />
            Try the playground
          </Link>
          <a
            href={PACKAGE_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'gap-2')}
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

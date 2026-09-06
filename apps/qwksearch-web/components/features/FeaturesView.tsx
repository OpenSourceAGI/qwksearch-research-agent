"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Download,
  Globe,
  Layers,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AuroraBackdrop,
  CountUp,
  Marquee,
  Pill,
  Reveal,
  SpotlightCard,
} from "@/components/features/effects";
import {
  ENGINE_NAMES,
  FEATURE_TABS,
  PACKAGES,
  PIPELINE,
  PLATFORMS,
  PROVIDERS,
  SEARCH_CATEGORIES,
  STATS,
} from "@/components/features/data";
import { config } from "@/lib/config/site";

function SectionHeading({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: React.ReactNode;
  blurb?: string;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <Pill className="mb-4">{eyebrow}</Pill>
      <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {blurb && (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed text-pretty">
          {blurb}
        </p>
      )}
    </Reveal>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:px-6 lg:px-8">
      <AuroraBackdrop />

      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <Pill className="mb-6">
            <Sparkles className="size-3.5" />
            Everything {config.appName} can do
          </Pill>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Search the whole web.
            <br />
            <span className="qs-shimmer-text bg-gradient-to-r from-sky-500 via-violet-500 to-sky-500 bg-clip-text text-transparent">
              Read every source.
              <br />
              Write the answer.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty">
            A research agent that queries 100+ sites, extracts and cites the
            articles, PDFs, and videos behind them, and drops the result into a
            full writing editor — on the web, your desktop, your browser, and
            your IDE.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/">
                Start researching
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">
                <PenLine />
                Open REASON editor
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-3 lg:grid-cols-5">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-card/60 px-4 py-6 backdrop-blur-sm transition-colors hover:bg-card"
              >
                <dt className="text-3xl font-bold tracking-tight tabular-nums">
                  <CountUp value={stat.value} />
                  {stat.suffix}
                </dt>
                <dd className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

function VideoDemo() {
  return (
    <section className="relative px-4 pb-4 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-4xl">
        <div className="qs-border-beam relative isolate overflow-hidden rounded-3xl p-px">
          <div className="bg-card/90 relative z-10 overflow-hidden rounded-[calc(1.5rem-1px)] border backdrop-blur-sm">
            <div className="relative aspect-video">
              <iframe
                src="https://www.youtube-nocookie.com/embed/DzykBAdrw6s?start=367"
                title={`${config.appName} demo video`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 size-full"
              />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function EngineMarquee() {
  const half = Math.ceil(ENGINE_NAMES.length / 2);
  const rows = [ENGINE_NAMES.slice(0, half), ENGINE_NAMES.slice(half)];

  return (
    <section className="relative py-10">
      <Reveal className="mx-auto mb-6 max-w-2xl px-4 text-center">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
          One query, every index
        </p>
      </Reveal>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <Marquee
            key={index}
            durationSeconds={index === 0 ? 46 : 54}
            reverse={index === 1}
          >
            {row.map((name) => (
              <span
                key={name}
                className="qs-chip bg-card/70 text-muted-foreground rounded-full border px-4 py-1.5 text-sm whitespace-nowrap transition-colors"
              >
                {name}
              </span>
            ))}
          </Marquee>
        ))}
      </div>
    </section>
  );
}

function BentoGrid() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The loop"
          title="Ask, search, read, cite, write — without leaving the tab"
          blurb="Most research tools stop at a list of links. This one carries a question all the way to a finished, sourced document."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <SpotlightCard className="h-full">
              <div className="flex h-full flex-col p-7">
                <div className="qs-accent-soft mb-5 inline-flex size-11 w-fit items-center justify-center rounded-xl border">
                  <Search className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">
                  Search 100+ sites in 13 categories
                </h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  General engines, academic databases, code registries, video
                  platforms, news wires, and archives — queried in parallel,
                  deduplicated, and ranked by domain authority.
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  {SEARCH_CATEGORIES.map((category) => (
                    <Badge
                      key={category.label}
                      variant="soft"
                      className="qs-accent-soft gap-1.5 px-3 py-1"
                    >
                      <category.icon />
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={80}>
            <SpotlightCard className="h-full">
              <div className="p-7">
                <div className="qs-accent-soft mb-5 inline-flex size-11 items-center justify-center rounded-xl border">
                  <Bot className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">Any model you trust</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Swap providers per conversation, or bring your own key.
                </p>
                <ul className="mt-5 space-y-2">
                  {PROVIDERS.slice(0, 6).map((provider) => (
                    <li key={provider} className="flex items-center gap-2 text-sm">
                      <Check className="qs-accent-text size-3.5 shrink-0" />
                      {provider}
                    </li>
                  ))}
                  <li className="text-muted-foreground text-sm">
                    + {PROVIDERS.length - 6} more providers
                  </li>
                </ul>
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={40}>
            <SpotlightCard className="h-full">
              <div className="p-7">
                <div className="qs-accent-soft mb-5 inline-flex size-11 items-center justify-center rounded-xl border">
                  <Layers className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">Read before you click</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Every result expands into cleaned article text with an APA
                  citation and a summary — including PDFs and YouTube
                  transcripts.
                </p>
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={120} className="md:col-span-2">
            <SpotlightCard className="h-full">
              <div className="flex h-full flex-col p-7">
                <div className="qs-accent-soft mb-5 inline-flex size-11 w-fit items-center justify-center rounded-xl border">
                  <PenLine className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">
                  REASON: the writing half of research
                </h3>
                <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  A Lexical-based editor with a nested document tree, AI
                  rewriting, collaborative editing, research quotes, and Word,
                  PDF, and Google Docs import and export.
                </p>
                <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
                  {[
                    "Nested document tree",
                    "Slash commands & Mermaid",
                    "Yjs collaboration",
                    "20+ interface languages",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <Check className="qs-accent-text size-3.5 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="How it works"
          title="How a question becomes a cited answer"
          blurb="Five stages, each one a package you can use on its own."
        />

        <div className="relative grid gap-4 lg:grid-cols-5">
          {/* Connecting rail behind the cards, desktop only. */}
          <div
            aria-hidden
            className="via-border absolute top-14 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent to-transparent lg:block"
          />

          {PIPELINE.map((stage, index) => (
            <Reveal key={stage.step} delay={index * 70} className="relative">
              <SpotlightCard beam={false} className="h-full">
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="qs-accent-fill inline-flex size-9 items-center justify-center rounded-xl">
                      <stage.icon className="size-4" />
                    </span>
                    <span className="text-muted-foreground/60 text-sm font-semibold tabular-nums">
                      {stage.step}
                    </span>
                  </div>
                  <h3 className="font-semibold">{stage.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {stage.body}
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureExplorer() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Every feature"
          title="Four surfaces, one stack"
          blurb="Pick a surface to see everything it ships with today."
        />

        <Reveal>
          <Tabs defaultValue={FEATURE_TABS[0].value} className="gap-8">
            <TabsList className="mx-auto flex w-full max-w-2xl flex-wrap">
              {FEATURE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <tab.icon />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {FEATURE_TABS.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-500"
              >
                <div className="mx-auto mb-10 max-w-2xl text-center">
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {tab.headline}
                  </h3>
                  <p className="text-muted-foreground mt-3 leading-relaxed text-pretty">
                    {tab.blurb}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tab.features.map((feature) => (
                    <SpotlightCard key={feature.title} className="h-full">
                      <div className="group/feature p-6">
                        <div className="qs-accent-soft mb-4 inline-flex size-10 items-center justify-center rounded-xl border transition-transform duration-300 group-hover/feature:scale-110">
                          <feature.icon className="size-5" />
                        </div>
                        <h4 className="font-semibold">{feature.title}</h4>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </SpotlightCard>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>
      </div>
    </section>
  );
}

function Platforms() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Everywhere"
          title="Four ways to run it"
          blurb="Every client talks to the same documented API, so your history, keys, and documents follow you between them."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((platform, index) => {
            const card = (
              <SpotlightCard className="h-full">
                <div className="flex h-full flex-col p-6">
                  <div className="qs-accent-soft mb-4 inline-flex size-11 items-center justify-center rounded-xl border">
                    <platform.icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{platform.name}</h3>
                  <p className="qs-accent-text mt-0.5 text-xs font-medium tracking-wide uppercase">
                    {platform.tagline}
                  </p>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {platform.detail}
                  </p>
                </div>
              </SpotlightCard>
            );

            return (
              <Reveal key={platform.name} delay={index * 70}>
                {platform.href ? (
                  <Link href={platform.href} className="block h-full">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OpenSource() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Open source"
          title="Built from packages you can use yourself"
          blurb="The product is a thin shell over a monorepo of standalone, independently published libraries."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((pkg, index) => (
            <Reveal key={pkg.name} delay={(index % 3) * 60}>
              <SpotlightCard beam={false} spotlightSize={280} className="h-full">
                <div className="p-5">
                  <code className="qs-accent-text text-sm font-semibold">
                    {pkg.name}
                  </code>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {pkg.blurb}
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative px-4 pt-10 pb-28 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-4xl">
        <div className="qs-border-beam relative isolate overflow-hidden rounded-3xl p-px">
          <div className="bg-card/90 relative z-10 rounded-[calc(1.5rem-1px)] border px-8 py-14 text-center backdrop-blur-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent"
            />
            <div className="relative">
              <Pill className="mb-5">
                <Globe className="size-3.5" />
                Free to start
              </Pill>
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Ask something you actually need answered
              </h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed text-pretty">
                No setup, no key required. Bring your own model when you want
                more control, or self-host the whole stack.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="group">
                  <Link href="/">
                    Start researching
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/enterprise">
                    <Download />
                    Enterprise & white-label
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function FeaturesView() {
  return (
    <div className="qs-features relative min-h-screen md:pl-20">
      <Hero />
      <VideoDemo />
      <EngineMarquee />
      <BentoGrid />
      <Pipeline />
      <FeatureExplorer />
      <Platforms />
      <OpenSource />
      <ClosingCta />
    </div>
  );
}

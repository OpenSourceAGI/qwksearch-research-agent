"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  CircleDollarSign,
  Download,
  Globe,
  Layers,
  Minus,
  PenLine,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OrbitingCirclesGlobe from "@/components/ui/orbiting-circles-02";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AnchorLink,
  AuroraBackdrop,
  CountUp,
  Marquee,
  Pill,
  Reveal,
  SpotlightCard,
} from "@/components/features/effects";
import {
  APP_SCREENSHOT,
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  ENGINE_NAMES,
  FEATURE_TABS,
  PIPELINE,
  PROJECT_BADGES,
  PROVIDERS,
  SEARCH_CATEGORIES,
  STATS,
  faviconUrl,
  type ComparisonStatus,
} from "@/components/features/data";
import { config } from "@/lib/config/site";
import { cn } from "@/lib/utils";

/**
 * Section title with a deep-linkable heading. The `id` is the section's hash:
 * hovering the title reveals a link icon that copies `…/features#<id>`, and
 * `scroll-mt-28` keeps the eyebrow pill in frame when you arrive on one.
 */
function SectionHeading({
  id,
  eyebrow,
  title,
  blurb,
}: {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  blurb?: string;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <Pill className="mb-4">{eyebrow}</Pill>
      <h2
        id={id}
        className="group scroll-mt-28 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        {title}
        <AnchorLink id={id} label={eyebrow} />
      </h2>
      {blurb && (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed text-pretty">
          {blurb}
        </p>
      )}
    </Reveal>
  );
}

/**
 * The README's badge wall. Uniform height rather than each badge's natural
 * size — the row mixes `flat` and `for-the-badge` styles, which differ by a
 * factor of two — and every badge carries its alt text as a tooltip, since a
 * shields.io image says nothing on hover by itself.
 */
function BadgeWall() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
      {PROJECT_BADGES.map((badge) => {
        const image = (
          <img
            src={badge.src}
            alt={badge.alt}
            title={badge.alt}
            loading="lazy"
            className="h-5 w-auto"
          />
        );

        return (
          <li key={badge.alt} className="flex">
            {badge.href ? (
              <a
                href={badge.href}
                target={badge.href.startsWith("/") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="opacity-80 transition-opacity hover:opacity-100"
              >
                {image}
              </a>
            ) : (
              image
            )}
          </li>
        );
      })}
    </ul>
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
            A game changing first innovation.
            <br />
            <span className="qs-shimmer-text bg-gradient-to-r from-sky-500 via-violet-500 to-sky-500 bg-clip-text text-transparent">
              The Research IDE.
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
              <Link href="/workspace">
                <PenLine />
                Open REASON editor
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={300} className="mx-auto mt-10 max-w-3xl">
          <BadgeWall />
        </Reveal>
      </div>

      {/* Search engines QwkSearch queries, orbiting the index. Deliberately
          outside the max-w-5xl column so the widest ring isn't clipped. */}
      <Reveal delay={320}>
        <OrbitingCirclesGlobe className="-mx-4 mt-10 -mb-6 sm:-mx-6 sm:mt-14 lg:-mx-8" />
      </Reveal>

      <div className="mx-auto max-w-5xl text-center">
        <Reveal delay={400}>
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

/**
 * The README's product shot. A plain <img> at the source's own aspect ratio:
 * it's a remote asset the Worker's image optimizer won't proxy, and the
 * intrinsic size is what keeps the frame from collapsing before it loads.
 */
function Screenshot() {
  return (
    <section className="relative px-4 pt-2 pb-6 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-5xl">
        <figure>
          <div className="qs-border-beam relative isolate overflow-hidden rounded-3xl p-px">
            <div className="bg-card/90 relative z-10 overflow-hidden rounded-[calc(1.5rem-1px)] border backdrop-blur-sm">
              <img
                src={APP_SCREENSHOT.src}
                alt={APP_SCREENSHOT.alt}
                loading="lazy"
                className="block w-full"
              />
            </div>
          </div>
          <figcaption className="text-muted-foreground mt-3 text-center text-xs">
            {APP_SCREENSHOT.caption}
          </figcaption>
        </figure>
      </Reveal>
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
          id="the-loop"
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

const COMPARISON_STATUS_META: Record<
  ComparisonStatus,
  { icon: React.ElementType; className: string; label: string }
> = {
  yes: { icon: Check, className: "text-emerald-500", label: "Yes" },
  partial: { icon: Minus, className: "text-amber-500", label: "Partial" },
  no: { icon: X, className: "text-muted-foreground/40", label: "No" },
  paid: { icon: CircleDollarSign, className: "text-muted-foreground", label: "Paid" },
};

function Comparison() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="how-it-compares"
          eyebrow="How it compares"
          title="The only open-source research IDE"
          blurb="Search breadth, cited answers, document ingestion, and a real writing editor — side by side with the closed alternatives."
        />

        <Reveal>
          <div className="qs-border-beam relative isolate overflow-hidden rounded-3xl p-px">
            <div className="bg-card/80 relative z-10 overflow-hidden rounded-[calc(1.5rem-1px)] border backdrop-blur-sm">
              {/* Title sits outside the scroll container so it stays put
                  while the 1080px-wide table is panned sideways; the <table>
                  carries the same text as its accessible name. */}
              <div className="border-b px-4 py-4 sm:px-6">
                <h3 className="text-base font-semibold tracking-tight">
                  {config.appName} vs. other research tools
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Feature by feature, as each product ships it today.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-sm">
                  <caption className="sr-only">
                    {config.appName} vs. other research tools, feature by
                    feature.
                  </caption>
                  <thead>
                    <tr className="border-b">
                      <th
                        scope="col"
                        className="bg-card sticky left-0 z-10 w-40 border-r px-4 py-4 text-left align-bottom"
                      >
                        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          Feature
                        </span>
                      </th>
                      {COMPARISON_COLUMNS.map((column) => (
                        <th
                          key={column.name}
                          scope="col"
                          className={cn(
                            "px-4 py-4 text-center align-bottom",
                            column.highlight && "qs-accent-soft",
                          )}
                        >
                          <a
                            href={column.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={cn(
                              "flex items-center justify-center gap-1.5 font-semibold hover:underline",
                              column.highlight && "qs-accent-text",
                            )}
                          >
                            <img
                              src={faviconUrl(column.domain)}
                              alt=""
                              aria-hidden
                              width={16}
                              height={16}
                              loading="lazy"
                              className="size-4 shrink-0 rounded-[3px]"
                              onError={(event) => {
                                // Ad blockers routinely block the Google
                                // favicon endpoint. Drop the mark rather than
                                // leaving a broken-image glyph in the header.
                                event.currentTarget.style.display = "none";
                              }}
                            />
                            {column.name}
                          </a>
                          {column.detail && (
                            <div className="text-muted-foreground text-[11px] font-normal">
                              {column.detail}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row) => (
                      <tr
                        key={row.feature}
                        className="hover:bg-muted/30 border-b transition-colors last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="bg-card sticky left-0 z-10 w-40 border-r px-4 py-4 text-left text-sm font-medium"
                        >
                          {row.feature}
                        </th>
                        {row.cells.map((cell, index) => {
                          const column = COMPARISON_COLUMNS[index];
                          const meta = COMPARISON_STATUS_META[cell.status];
                          return (
                            <td
                              key={column.name}
                              className={cn(
                                "px-4 py-4 text-center align-top",
                                column.highlight && "qs-accent-soft",
                              )}
                            >
                              <meta.icon
                                aria-hidden
                                className={cn("mx-auto size-4", meta.className)}
                              />
                              <span className="sr-only">{meta.label}</span>
                              {cell.note && (
                                <div
                                  className={cn(
                                    "mx-auto mt-1 max-w-44 text-xs leading-snug",
                                    column.highlight
                                      ? "text-foreground/80"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {cell.note}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="how-it-works"
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
          id="every-feature"
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
      <Screenshot />
      <VideoDemo />
      <EngineMarquee />
      <BentoGrid />
      <Comparison />
      <Pipeline />
      <FeatureExplorer />
      <ClosingCta />
    </div>
  );
}

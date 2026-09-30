/**
 * @file features-grid.tsx
 * @description What the package does, grouped the way the docs sidebar is:
 * the transcript API first, then the React UI half.
 */
import {
  Captions,
  Cloud,
  FileText,
  Globe,
  LayoutGrid,
  Library,
  type LucideIcon,
  PictureInPicture2,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

const featureCategories: { category: string; tagline: string; features: Feature[] }[] = [
  {
    category: 'Transcript API',
    tagline: 'Captions straight from YouTube, from any runtime with fetch.',
    features: [
      {
        icon: Zap,
        title: 'No browser, no API key',
        description:
          'Reads caption tracks directly from YouTube. No Puppeteer, no headless Chrome, no Data API quota.',
        href: '/docs/transcripts',
      },
      {
        icon: Cloud,
        title: 'Serverless & Workers-ready',
        description:
          'No filesystem, no native modules. Runs on AWS Lambda, Vercel Edge, Next.js route handlers and Cloudflare Workers.',
        href: '/docs/deploy-cloudflare',
      },
      {
        icon: Globe,
        title: 'Languages & translation',
        description:
          'Language fallback lists, manual vs auto-generated tracks, and YouTube’s own machine translation into 100+ languages.',
        href: '/docs/transcripts',
      },
      {
        icon: FileText,
        title: 'Six output formats',
        description: 'JSON, plain text, SRT, WebVTT, pretty-print, and an article format with character-to-timestamp mapping.',
        href: '/docs/formatters',
      },
      {
        icon: Terminal,
        title: 'CLI',
        description: 'npx extract-youtube <video> -f srt — any video ID or URL, straight to your terminal.',
        href: '/docs/cli',
      },
      {
        icon: Shield,
        title: 'Proxies',
        description:
          'Generic HTTP/HTTPS proxies, Webshare rotating residential IPs, or a fetch-through proxy on edge runtimes.',
        href: '/docs/proxies',
      },
    ],
  },
  {
    category: 'React components',
    tagline: 'extract-youtube/react — a separate entry point, so the fetcher never pulls in React.',
    features: [
      {
        icon: PictureInPicture2,
        title: 'Floating player',
        description:
          'Draggable, resizable, minimisable YouTube player with picture-in-picture, a queue, resume-after-reload and synced captions.',
        href: '/docs/react/floating-player',
      },
      {
        icon: Captions,
        title: 'Transcript modal',
        description: 'Video on the left, transcript on the right — it highlights and scrolls with playback; click a line to seek.',
        href: '/docs/react/transcript-modal',
      },
      {
        icon: LayoutGrid,
        title: 'Video grid and list',
        description:
          'Cards, a sortable table grouped by year, channel or your own fields, and stacked playlists, all opening in the floating player.',
        href: '/docs/react/video-grid',
      },
      {
        icon: Library,
        title: 'Library admin API',
        description:
          'One HTTP handler over D1 or memory: add, auto-fill, edit and resync videos, with custom fields and admin screens to match.',
        href: '/docs/admin/library-api',
      },
    ],
  },
];

export function FeaturesGrid() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything between a video ID and <span className="text-primary">usable text</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Fetch the transcript on the server, format it however you need, and show it to people with components
            built for it.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {featureCategories.map((group) => (
            <div key={group.category}>
              <div className="mb-6">
                <h3 className="text-xl font-semibold">{group.category}</h3>
                <p className="text-muted-foreground">{group.tagline}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.features.map((feature) => (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
                  >
                    <feature.icon className="mb-4 h-6 w-6 text-primary" />
                    <h4 className="mb-2 font-semibold group-hover:text-primary">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

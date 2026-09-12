"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared visual primitives for the marketing surfaces (/features).
 *
 * These are deliberately dependency-free (CSS + IntersectionObserver only) so
 * they can be dropped into any page without pulling an animation runtime into
 * the bundle. Keyframes live in `app/globals.css` under "Marketing page
 * effects".
 */

/** Fades + lifts children into view the first time they intersect. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Stagger, in ms. */
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    // No IntersectionObserver (older browsers, some test envs) → show at once.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      data-qs-reveal={shown ? "shown" : "hidden"}
      style={{ "--qs-reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Card that tracks the cursor with a soft radial highlight, plus an optional
 * rotating conic border beam on hover.
 */
export function SpotlightCard({
  children,
  className,
  beam = true,
  spotlightSize = 420,
}: {
  children: React.ReactNode;
  className?: string;
  /** Rotating gradient border on hover. */
  beam?: boolean;
  /** Radius of the cursor highlight, in px. */
  spotlightSize?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [spot, setSpot] = React.useState({ x: 0, y: 0, on: false });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      on: true,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setSpot((s) => ({ ...s, on: true }))}
      onMouseLeave={() => setSpot((s) => ({ ...s, on: false }))}
      className={cn(
        "group/spotlight relative isolate overflow-hidden rounded-2xl p-px",
        beam && "qs-border-beam",
        className,
      )}
    >
      <div className="bg-card/80 relative z-10 h-full rounded-[calc(1rem-1px)] border backdrop-blur-sm transition-colors duration-300 group-hover/spotlight:border-transparent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: spot.on ? 1 : 0,
            background: `radial-gradient(${spotlightSize}px circle at ${spot.x}px ${spot.y}px, color-mix(in oklab, var(--qs-accent, var(--primary)) 16%, transparent), transparent 60%)`,
          }}
        />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}

/** Full-bleed backdrop: grid lines, radial mask, and drifting aurora blobs. */
export function AuroraBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      <div className="bg-background absolute inset-0" />
      <div
        className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="qs-aurora-blob absolute -top-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-sky-500/25 blur-[120px]" />
      <div
        className="qs-aurora-blob absolute -top-24 right-1/5 h-[26rem] w-[26rem] rounded-full bg-sky-500/20 blur-[120px]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="qs-aurora-blob absolute top-40 left-0 h-[22rem] w-[22rem] rounded-full bg-violet-500/15 blur-[110px]"
        style={{ animationDelay: "-12s" }}
      />
    </div>
  );
}

/** Infinite horizontal ticker. Duplicates its children to loop seamlessly. */
export function Marquee({
  children,
  durationSeconds = 40,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  durationSeconds?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "qs-marquee group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]",
        className,
      )}
    >
      <div
        className="qs-marquee-track flex w-max shrink-0 items-center gap-3 pr-3"
        style={
          {
            "--qs-marquee-duration": `${durationSeconds}s`,
            "--qs-marquee-gap": "0.75rem",
            animationDirection: reverse ? "reverse" : "normal",
          } as React.CSSProperties
        }
      >
        {children}
        <span aria-hidden className="contents">
          {children}
        </span>
      </div>
    </div>
  );
}

/** Counts up to `value` once scrolled into view. */
export function CountUp({
  value,
  durationMs = 1200,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        // easeOutCubic — fast start, soft landing on the final number.
        setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/** Small pill used for section eyebrows and chips. */
export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "qs-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * GitHub-style anchor affordance for a section heading: hidden until the
 * heading is hovered (or the link itself focused), and copies that section's
 * fully-qualified `#hash` URL to the clipboard when clicked.
 *
 * It stays a real `<a href="#id">`, so middle-click, "copy link address" and
 * keyboard activation keep working, and modified clicks are left alone. The
 * click handler only takes over when the async clipboard is actually
 * available — it is not on plain HTTP — otherwise the browser just follows
 * the anchor. Touch devices never hover, so the icon is always shown there.
 */
export function AnchorLink({
  id,
  label,
  className,
}: {
  /** Target element's `id`; also the hash that gets copied. */
  id: string;
  /** What the section is, for the screen-reader label. */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const clipboard =
      typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard?.writeText) return;

    event.preventDefault();
    const { origin, pathname, search } = window.location;

    clipboard.writeText(`${origin}${pathname}${search}#${id}`).then(
      () => {
        // Put the hash in the address bar without re-triggering a scroll —
        // the heading the link belongs to is already on screen.
        window.history.replaceState(null, "", `#${id}`);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      },
      () => {
        // Clipboard refused (permissions, focus) — fall back to navigating.
        window.location.hash = id;
      },
    );
  };

  return (
    <span className="relative ml-2 inline-flex align-middle">
      <a
        href={`#${id}`}
        onClick={handleClick}
        aria-label={
          copied ? "Link copied" : `Copy link to ${label ?? "this section"}`
        }
        className={cn(
          "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring inline-flex size-8 -translate-y-[0.08em] items-center justify-center rounded-lg opacity-0 transition-[color,background-color,opacity] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none [@media(hover:none)]:opacity-100",
          className,
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Link2 className="size-4" aria-hidden />
        )}
      </a>

      {copied && (
        <span className="bg-card pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border px-2 py-1 text-[11px] font-medium whitespace-nowrap shadow-sm">
          Copied!
        </span>
      )}

      {/* Announced on a mouse click, when the link itself never takes focus
          and the swapped `aria-label` would go unnoticed. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </span>
  );
}

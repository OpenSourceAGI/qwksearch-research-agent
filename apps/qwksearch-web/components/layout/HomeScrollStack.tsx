'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useChat, useMainView } from 'research-agent-ui';

import { isHomeLandingState } from '@/lib/home-landing';
import { cn } from '@/lib/utils';
import { WorkspaceMount } from '@/components/layout/WorkspaceMount';

/**
 * The homepage: the research workspace on the first screen, with the whole
 * /features page stacked directly underneath it.
 *
 * The workspace itself is a fixed 100vh app shell (ReasonDocs is
 * `h-screen … overflow-hidden`), so it can simply be stacked above a normal
 * document-flow section — the page scroll lives in the app's single scroll
 * container (`#app-scroll-root`, from components/layout/Providers.tsx), not on
 * `window`, which is why everything here measures and listens on that element.
 */

/**
 * Marketing content nobody sees until they scroll past the workspace — kept out
 * of the homepage's first-load bundle and streamed in behind the fold instead.
 * The placeholder reserves a screen of height so the cue below always has
 * somewhere to scroll to while the chunk is still in flight.
 */
const FeaturesView = dynamic(
  () => import('@/components/features/FeaturesView').then((mod) => mod.FeaturesView),
  { ssr: false, loading: () => <div className="min-h-screen" /> },
);

/** Nearest scrollable ancestor, for when the known scroll root isn't in the DOM. */
function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const overflowY = window.getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}

/**
 * How far the features slab has travelled into view: 0 while it still sits
 * entirely below the fold, 1 once its top edge has risen through 55% of the
 * viewport. Drives both the fade-in and which way the scroll cue points.
 *
 * `enabled` is false whenever the slab isn't mounted at all (see
 * `isHomeLandingState`); the progress then snaps back to 0 so a reader who
 * scrolled down and then started a chat doesn't leave the cue stuck pointing
 * back up at content that no longer exists.
 */
function useEnterProgress(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const el = enabled ? ref.current : null;
    if (!el) {
      setProgress(0);
      return;
    }

    const scroller =
      document.getElementById('app-scroll-root') ?? findScrollParent(el) ?? null;
    const target: HTMLElement | Window = scroller ?? window;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const viewport = window.innerHeight || 1;
      const travelled = viewport - el.getBoundingClientRect().top;
      const next = Math.min(1, Math.max(0, travelled / (viewport * 0.55)));
      // Ignore sub-pixel churn so a scroll doesn't re-render the whole slab on
      // every single frame.
      setProgress((prev) => (Math.abs(prev - next) < 0.004 ? prev : next));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, enabled]);

  return progress;
}

function ScrollCue({
  direction,
  onClick,
}: {
  direction: 'down' | 'up';
  onClick: () => void;
}) {
  const isDown = direction === 'down';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isDown ? 'Scroll down to features' : 'Scroll back up to the workspace'}
      title={isDown ? 'See what it does' : 'Back to the workspace'}
      className={cn(
        'qs-scroll-cue group fixed right-4 z-30 flex items-center gap-2',
        'rounded-full border bg-background/80 py-2 pr-3 pl-4 shadow-lg backdrop-blur-md',
        'text-muted-foreground hover:text-foreground text-xs font-medium',
        'transition-[color,border-color,bottom] duration-300 hover:border-sky-500/50',
        'md:right-6',
      )}
    >
      <span className="hidden sm:inline">{isDown ? 'Features' : 'Top'}</span>
      <ChevronDown
        aria-hidden
        className={cn(
          'size-4 transition-transform duration-500',
          isDown ? 'qs-scroll-cue-bob' : 'rotate-180',
        )}
      />
    </button>
  );
}

export function HomeScrollStack() {
  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const featuresRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const pathname = usePathname();
  const { activeView } = useMainView();
  const { chatTurns } = useChat();

  // The features slab belongs to the homepage's landing state and nowhere
  // else. The workspace never leaves `/` — chats and REASON documents are tabs
  // within this one route — so a route check alone would leave a screen of
  // marketing copy scrollable underneath a live conversation. Mount it only
  // while the first screen is still the empty research view; the moment a chat
  // is submitted it unmounts, and the page is a plain 100vh app shell again.
  const showFeatures = isHomeLandingState({
    pathname,
    activeView,
    chatTurnCount: chatTurns.length,
  });

  const progress = useEnterProgress(featuresRef, showFeatures);

  // Flip the cue only once the features cover more than half the screen —
  // pointing "up" any earlier would strand a reader who is still on their way
  // down. Read from the raw progress, not the fade below, so the direction
  // stays correct when motion is reduced.
  const showingFeatures = progress > 0.9;

  // The cue only ever points at the slab, so it lives and dies with it.
  const showCue = showFeatures;

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="relative">
      {/* First screen: the workspace, exactly as it renders on its own. This
          wrapper stays untransformed and unpositioned on purpose — either would
          turn it into a containing block and re-anchor the app's `fixed` and
          `absolute` chrome (popovers, dialogs, the dock) to it. */}
      <div ref={workspaceRef} className="h-screen">
        <WorkspaceMount />
      </div>

      {showCue && (
        <ScrollCue
          direction={showingFeatures ? 'up' : 'down'}
          onClick={() => scrollTo(showingFeatures ? workspaceRef : featuresRef)}
        />
      )}

      {/* Second screen onward: the full /features page, easing in as it is
          scrolled up. Sections inside it keep their own staggered reveals.

          The fade sits on an inner wrapper so the measured/scrolled-to element
          stays untransformed: `getBoundingClientRect()` reports the translated
          position, so measuring the moving element would feed the fade back
          into its own input, and `scrollIntoView` would stop short of the real
          section boundary by however much it is currently offset. */}
      {showFeatures && (
        <div ref={featuresRef}>
          <div
            style={
              reducedMotion
                ? undefined
                : {
                    opacity: 0.12 + progress * 0.88,
                    transform: `translate3d(0, ${(1 - progress) * 48}px, 0)`,
                    willChange: progress < 1 ? 'opacity, transform' : undefined,
                  }
            }
          >
            <FeaturesView />
          </div>
        </div>
      )}
    </div>
  );
}

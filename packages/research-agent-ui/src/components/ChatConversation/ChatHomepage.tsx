/**
 * @fileoverview Full-screen homepage with a rotating AI-themed background artwork (image or video, served from a local cache), the QuantumWaveOrbital animation, recent history chips, the main chat input box, and an app footer.
 */
'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import { GradientBlur } from '../../ui/gradient-blur';
import ChatInputBox from '../MessageComposer/ChatInputBox';
import RecentHistoryChips from './RecentHistoryChips';
import Footer from '../Footer';
import type { WeatherLocationInput } from 'use-weather-forecast';
import { useChat } from '../../hooks/useChat';
import {
  MAX_CACHED_BACKGROUNDS,
  cacheBackground,
  loadCachedBackground,
  pickCachedBackground,
  pickUncachedBackground,
  readCachedBackgroundList,
} from './background-cache';
import { researchAgentUIConfig } from '../../config';
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';
// Stylesheet is imported by the host app (globals.css) inside a named cascade
// layer instead of here — it's a Tailwind v3 build with an unlayered `*`
// reset that would otherwise beat every Tailwind v4 utility in the app.

// Split out of the homepage's first-load bundle: the chat input is what the
// first screen is for, so it should not wait on code for widgets that are
// waiting on their own network requests anyway, or for a dialog nobody has
// opened yet.
const WeatherForecast = lazy(() =>
  import('use-weather-forecast').then((mod) => ({ default: mod.WeatherForecast })),
);
const TrendingNews = lazy(() =>
  import('trending-news-api').then((mod) => ({ default: mod.TrendingNews })),
);
const EducationPlaylists = lazy(() =>
  import('education-playlists').then((mod) => ({ default: mod.EducationPlaylists })),
);
const DownloadsDialog = lazy(() => import('./DownloadsDialog'));

/**
 * Topics the widget shows once expanded — and therefore how many the endpoint
 * is asked for, since every extra topic costs it one upstream news search.
 */
const TRENDING_NEWS_EXPANDED_TOPICS = 15;

/**
 * The host app's site-wide news-widget settings (`/api/news/settings`), which
 * an admin controls. They gate the local settings rather than replace them:
 * the site can switch the widget off for everyone, and can decline to honour
 * per-user topics, but a user who has said nothing simply gets the site's
 * defaults.
 */
type NewsSiteSettings = {
  enabled: boolean;
  allowUserTopics: boolean;
  defaultTopics?: string;
  maxTopics: number;
  showImages: boolean;
};

/**
 * Parses the `trendingNewsCustomTopics` setting — one topic per line, or
 * comma separated — into the list the widget follows instead of the daily
 * trending ranking. The server re-parses and caps this; the trimming here is
 * so a trailing newline never becomes an empty topic in the URL.
 */
function parseCustomTopics(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((topic) => topic.trim())
    .filter(Boolean);
}

/**
 * Parses the `weatherLocations` setting (one location per line, formatted as
 * "Label, latitude, longitude") into structured entries for the weather
 * widget. Lines without valid coordinates fall back to a label-only entry
 * (which auto-detects the current location). Blank input yields no locations,
 * so the widget auto-detects a single current location.
 */
function parseWeatherLocations(raw: string | null): WeatherLocationInput[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      const lat = Number(parts[parts.length - 2]);
      const lon = Number(parts[parts.length - 1]);
      const hasCoords =
        parts.length >= 2 &&
        parts[parts.length - 2] !== '' &&
        parts[parts.length - 1] !== '' &&
        Number.isFinite(lat) &&
        Number.isFinite(lon);
      if (hasCoords) {
        const label = parts.slice(0, parts.length - 2).filter(Boolean).join(', ');
        return { label: label || undefined, latitude: lat, longitude: lon };
      }
      return { label: line };
    });
}

const isVideo = (url: string) => url.endsWith('.webm') || url.endsWith('.mp4');

/**
 * A background on screen: `url` is the artwork's own address (what the cache
 * is keyed by, and what says whether it is a video); `src` is what the element
 * loads, usually an object URL of the cached copy.
 */
type Background = { url: string; src: string };

const isObjectUrl = (src: string) => src.startsWith('blob:');

/**
 * Resolves once a background is ready to show, so a crossfade never reveals a
 * half-loaded image. Images are decoded off-screen; videos resolve straight
 * away and stream (or play from their blob) once mounted. Resolves `false` for
 * an image that failed to load.
 */
function preloadBackground({ url, src }: Background): Promise<boolean> {
  if (isVideo(url)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * The homepage component for the chat interface.
 * Displays a background artwork (image or video), a settings button,
 * and the main chat input box fixed at the bottom of the screen.
 */
export default function ChatHomepage() {
  const { sendMessage } = useChat();
  const [background, setBackground] = useState<Background | null>(null);
  const [nextBackground, setNextBackground] = useState<Background | null>(null);
  const [fading, setFading] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  // The dialog's chunk is only fetched on first open, and it then stays
  // mounted so its close animation still plays.
  const [downloadsRequested, setDownloadsRequested] = useState(false);
  const [weatherLocations, setWeatherLocations] = useState<WeatherLocationInput[]>([]);
  const [showWeatherWidget, setShowWeatherWidget] = useState(true);
  const [weatherForecastDays, setWeatherForecastDays] = useState(5);
  const [weatherForecastHours, setWeatherForecastHours] = useState(12);
  const [weatherTemperatureUnit, setWeatherTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit');
  const [trendingNewsApiUrl, setTrendingNewsApiUrl] = useState<string | null>(null);
  const [showTrendingNewsWidget, setShowTrendingNewsWidget] = useState(true);
  // `null` means "the user has not chosen", which is what lets the site-wide
  // setting supply the value instead of a hardcoded default overriding it.
  const [trendingNewsMaxTopics, setTrendingNewsMaxTopics] = useState<number | null>(null);
  const [trendingNewsShowImages, setTrendingNewsShowImages] = useState<boolean | null>(null);
  const [trendingNewsCustomTopics, setTrendingNewsCustomTopics] = useState<string[]>([]);
  const [newsSiteSettings, setNewsSiteSettings] = useState<NewsSiteSettings | null>(null);
  const [showEducationWidget, setShowEducationWidget] = useState(true);
  // The weather and news widgets (their chunks and their API calls) wait until
  // the page has loaded and the browser is idle, so they never compete with the
  // orb, the input and the background for first paint.
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [orbHoverGlow, setOrbHoverGlow] = useState(false);
  // Off by default; enabled via the "Cursor Glow Trail" setting.
  const [cursorGlowTrail, setCursorGlowTrail] = useState(false);
  const footerLinks = researchAgentUIConfig.footerLinks.map((link) =>
    link.url === '/#downloads'
      ? {
          ...link,
          onClick: () => {
            setDownloadsRequested(true);
            setDownloadsOpen(true);
          },
        }
      : link,
  );
  // The host app serves trending news itself (`/api/news/trending` by default,
  // so the News API key stays on the server); the setting only has to be filled
  // in to point the widget at a different deployment.
  const trendingNewsEndpoint = trendingNewsApiUrl || researchAgentUIConfig.trendingNewsApiUrl;
  // A site that has switched the widget off, or that does not honour per-user
  // topics, overrides the local settings; everything else the site provides is
  // only a default for a user who has not chosen.
  const newsWidgetAllowed = newsSiteSettings?.enabled !== false;
  const newsTopics =
    newsSiteSettings?.allowUserTopics === false ? [] : trendingNewsCustomTopics;
  const newsMaxTopics = trendingNewsMaxTopics ?? newsSiteSettings?.maxTopics ?? 6;
  const newsShowImages = trendingNewsShowImages ?? newsSiteSettings?.showImages ?? true;
  const showNewsWidget = showTrendingNewsWidget && newsWidgetAllowed;

  useEffect(() => {
    const url = researchAgentUIConfig.trendingNewsSettingsUrl;
    // Hosts without this route (the desktop app, the extension) leave the URL
    // blank and follow their local settings alone.
    if (!url) return;

    let active = true;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (active && settings) setNewsSiteSettings(settings as NewsSiteSettings);
      })
      // An unreachable settings route must not take the widget with it: the
      // local settings already describe a working widget.
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const readLocations = () => {
      setWeatherLocations(parseWeatherLocations(localStorage.getItem('weatherLocations')));
      setShowWeatherWidget(localStorage.getItem('showWeatherWidget') !== 'false');
      setWeatherForecastDays(Number(localStorage.getItem('weatherForecastDays')) || 5);
      setWeatherForecastHours(Number(localStorage.getItem('weatherForecastHours')) || 12);
      setWeatherTemperatureUnit(localStorage.getItem('weatherTemperatureUnit') === 'celsius' ? 'celsius' : 'fahrenheit');
      setTrendingNewsApiUrl(localStorage.getItem('trendingNewsApiUrl'));
      setShowTrendingNewsWidget(localStorage.getItem('showTrendingNewsWidget') !== 'false');
      const maxTopics = localStorage.getItem('trendingNewsMaxTopics');
      setTrendingNewsMaxTopics(maxTopics ? Number(maxTopics) || null : null);
      const showImages = localStorage.getItem('trendingNewsShowImages');
      setTrendingNewsShowImages(showImages === null ? null : showImages !== 'false');
      setTrendingNewsCustomTopics(parseCustomTopics(localStorage.getItem('trendingNewsCustomTopics')));
      setShowEducationWidget(localStorage.getItem('showEducationPlaylistsWidget') !== 'false');
      setOrbHoverGlow(localStorage.getItem('orbHoverGlow') === 'true');
      setCursorGlowTrail(localStorage.getItem('cursorGlowTrail') === 'true');
    };
    readLocations();
    window.addEventListener('client-config-changed', readLocations);
    window.addEventListener('storage', readLocations);
    return () => {
      window.removeEventListener('client-config-changed', readLocations);
      window.removeEventListener('storage', readLocations);
    };
  }, []);

  useEffect(() => {
    let cancel: (() => void) | undefined;
    const ready = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(() => setWidgetsReady(true), { timeout: 2500 });
        cancel = () => window.cancelIdleCallback(handle);
      } else {
        const handle = window.setTimeout(() => setWidgetsReady(true), 800);
        cancel = () => window.clearTimeout(handle);
      }
    };
    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready, { once: true });
    return () => {
      window.removeEventListener('load', ready);
      cancel?.();
    };
  }, []);

  useEffect(() => {
    const showBg = localStorage.getItem('showBackgroundArt');
    if (showBg === 'false') return;

    // First paint never waits on Imgur: a returning visitor gets a piece read
    // straight out of Cache Storage (see `background-cache.ts`), and a first
    // visit starts on the plain page. Downloading — some of the artwork is
    // multi-megabyte video — waits until the page has loaded and the browser
    // is idle, so it never competes with the app's own scripts. From then on
    // the next piece is always prepared one rotation ahead, the cache grows by
    // one piece per rotation until it is full, and the rotation pauses while
    // the tab is hidden.
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelStart: (() => void) | undefined;
    let current: Background | null = null;
    let upcoming: Promise<Background | null> | null = null;
    // Every object URL handed out, so none outlives the page.
    const objectUrls = new Set<string>();

    const track = (bg: Background | null) => {
      if (bg && isObjectUrl(bg.src)) objectUrls.add(bg.src);
      return bg;
    };
    const release = (bg: Background | null) => {
      if (bg && isObjectUrl(bg.src)) {
        URL.revokeObjectURL(bg.src);
        objectUrls.delete(bg.src);
      }
    };

    /** Loads a piece and waits until it can be shown without a half-drawn frame. */
    const ready = async (bg: Background | null) => {
      if (!bg) return null;
      if (cancelled || !(await preloadBackground(bg))) {
        release(bg);
        return null;
      }
      return bg;
    };

    const fromCache = async (url: string | null) => {
      if (!url) return null;
      const src = await loadCachedBackground(url);
      return ready(track(src ? { url, src } : null));
    };

    /**
     * The piece after `after`: a new one, downloaded into the cache, while the
     * cache has room; otherwise one already cached. Either way it falls back to
     * the other, so a failed download still rotates.
     */
    const prepareNext = async (after: Background | null) => {
      const fresh =
        readCachedBackgroundList().length < MAX_CACHED_BACKGROUNDS
          ? pickUncachedBackground()
          : null;
      if (fresh) {
        const src = await cacheBackground(fresh);
        const bg = await ready(track(src ? { url: fresh, src } : null));
        if (bg) return bg;
      }
      return fromCache(pickCachedBackground(after?.url));
    };

    const show = (bg: Background) => {
      const previous = current;
      current = bg;
      if (!previous) {
        setBackground(bg);
        return;
      }
      setNextBackground(bg);
      setFading(true);
      fadeTimer = setTimeout(() => {
        setBackground(bg);
        setFading(false);
        setNextBackground(null);
        release(previous);
      }, 1000);
    };

    // A download slower than the interval must not let two rotations show the
    // same prepared piece.
    let rotating = false;
    const rotate = async () => {
      if (document.hidden || rotating) return;
      rotating = true;
      const bg = await (upcoming ?? prepareNext(current));
      upcoming = null;
      rotating = false;
      if (cancelled) return;
      if (bg) show(bg);
      upcoming = prepareNext(current);
    };

    // A returning visitor's first piece comes out of the cache, not the network.
    const initial = fromCache(pickCachedBackground()).then((bg) => {
      if (bg && !cancelled) show(bg);
    });

    const start = () => {
      initial.then(() => {
        if (cancelled) return;
        // A first visit has nothing on screen yet: fetch one now instead of
        // leaving the page bare for a whole rotation.
        if (!current) rotate();
        else upcoming = prepareNext(current);
        interval = setInterval(rotate, 20000);
      });
    };

    const scheduleStart = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(start, { timeout: 3000 });
        cancelStart = () => window.cancelIdleCallback(handle);
      } else {
        const handle = window.setTimeout(start, 1000);
        cancelStart = () => window.clearTimeout(handle);
      }
    };

    if (document.readyState === 'complete') scheduleStart();
    else window.addEventListener('load', scheduleStart, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', scheduleStart);
      cancelStart?.();
      clearInterval(interval);
      clearTimeout(fadeTimer);
      for (const src of objectUrls) URL.revokeObjectURL(src);
    };
  }, []);

  const renderBackground = ({ url, src }: Background, opacity: string) =>
    isVideo(url) ? (
      <video
        key={src}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${opacity}`}
      />
    ) : (
      <img
        key={src}
        src={src}
        alt=""
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${opacity}`}
      />
    );

  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0 z-0">
        {background && renderBackground(background, fading ? 'opacity-0' : 'opacity-30')}
        {nextBackground && renderBackground(nextBackground, fading ? 'opacity-30' : 'opacity-0')}
        {cursorGlowTrail && <GradientBlur />}
      </div>

      <div className="relative z-10">
        {/* Content: centered on desktop, bottom-aligned on mobile so the column
            sits just above the app dock with almost no gap */}
        <div className="flex flex-col items-center justify-end md:justify-center min-h-[calc(100dvh-64px)] md:min-h-screen max-w-screen-sm mx-auto p-2 pb-1 md:pb-2">
          <div
            style={{ height: '200px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className={orbHoverGlow ? undefined : 'pointer-events-none'}
          >
            <QuantumWaveOrbital
              autoRandomize={true}
              onSphereClick={() => console.log('Sphere clicked')}
              className="my-custom-class"
            />
          </div>

          <div className="w-full max-w-2xl mt-8 space-y-2">
            <RecentHistoryChips />
            {/* The input leads the column; the Learn, news and weather widgets sit below it. */}
            <ChatInputBox />
            {widgetsReady && (showEducationWidget || showWeatherWidget || showNewsWidget) && (
              <Suspense fallback={null}>
                <div className="flex flex-col gap-2 w-full">
                  {/* Learn (education playlists) sits on top, then news, with
                      the compact weather widget below them. The weather widget
                      is fluid, so it spans the full column width on its own
                      row (current conditions on the left, the next days on the
                      right). */}
                  {showEducationWidget && (
                    <EducationPlaylists
                      compact
                      planEndpoint={researchAgentUIConfig.educationPlaylistsApiUrl || undefined}
                      openHref={researchAgentUIConfig.educationPlaylistsPageUrl || undefined}
                      className="rounded-2xl w-full"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'inherit',
                        backdropFilter: 'blur(8px)',
                        maxWidth: '100%',
                      }}
                    />
                  )}
                  {showNewsWidget && (
                    <TrendingNews
                      compact
                      expandable
                      maxTopics={newsMaxTopics}
                      expandedMaxTopics={TRENDING_NEWS_EXPANDED_TOPICS}
                      showImages={newsShowImages}
                      apiEndpoint={trendingNewsEndpoint}
                      topics={newsTopics}
                      limit={TRENDING_NEWS_EXPANDED_TOPICS}
                      className="rounded-2xl w-full"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'inherit',
                        backdropFilter: 'blur(8px)',
                        maxWidth: '100%',
                      }}
                    />
                  )}
                  {showWeatherWidget && (
                    <WeatherForecast
                      compact
                      forecastDays={weatherForecastDays}
                      forecastHours={weatherForecastHours}
                      temperatureUnit={weatherTemperatureUnit}
                      locations={weatherLocations.length > 0 ? weatherLocations : undefined}
                      className="rounded-2xl w-full"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'inherit',
                        backdropFilter: 'blur(8px)',
                      }}
                    />
                  )}
                </div>
              </Suspense>
            )}
          </div>
          {/* In the column's flow on mobile, so it sits between the input and
              the app dock; pinned to the bottom of the screen on desktop. */}
          <Footer listFooterLinks={footerLinks} />
        </div>
      </div>

      {downloadsRequested && (
        <Suspense fallback={null}>
          <DownloadsDialog open={downloadsOpen} onOpenChange={setDownloadsOpen} />
        </Suspense>
      )}
    </div>
  );
}

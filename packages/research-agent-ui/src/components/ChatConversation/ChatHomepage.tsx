/**
 * @fileoverview Full-screen homepage with a randomised AI-themed background artwork (image or video), the QuantumWaveOrbital animation, recent history chips, the main chat input box, and an app footer.
 */
'use client';
import { useEffect, useState } from 'react';
import { GradientBlur } from '../../ui/gradient-blur';
import ChatInputBox from '../MessageComposer/ChatInputBox';
import RecentHistoryChips from './RecentHistoryChips';
import Footer from '../Footer';
import DownloadsDialog from './DownloadsDialog';
import { WeatherForecast, type WeatherLocationInput } from 'use-weather-forecast';
import { TrendingNews } from 'trending-news-api';
import { useChat } from '../../hooks/useChat';
import { getBackgroundArtwork } from './background-art';
import { researchAgentUIConfig } from '../../config';
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';
// Stylesheet is imported by the host app (globals.css) inside a named cascade
// layer instead of here — it's a Tailwind v3 build with an unlayered `*`
// reset that would otherwise beat every Tailwind v4 utility in the app.

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

/**
 * The homepage component for the chat interface.
 * Displays a background artwork (image or video), a settings button,
 * and the main chat input box fixed at the bottom of the screen.
 */
export default function ChatHomepage() {
  const { sendMessage } = useChat();
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [nextBackgroundUrl, setNextBackgroundUrl] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
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
  const [orbHoverGlow, setOrbHoverGlow] = useState(false);
  // Off by default; enabled via the "Cursor Glow Trail" setting.
  const [cursorGlowTrail, setCursorGlowTrail] = useState(false);
  const footerLinks = researchAgentUIConfig.footerLinks.map((link) =>
    link.url === '/#downloads' ? { ...link, onClick: () => setDownloadsOpen(true) } : link,
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
    const showBg = localStorage.getItem('showBackgroundArt');
    if (showBg === 'false') return;

    setBackgroundUrl(getBackgroundArtwork());

    const interval = setInterval(() => {
      const next = getBackgroundArtwork();
      setNextBackgroundUrl(next);
      setFading(true);
      setTimeout(() => {
        setBackgroundUrl(next);
        setFading(false);
        setNextBackgroundUrl(null);
      }, 1000);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const isVideo = (url: string) => url.endsWith('.webm') || url.endsWith('.mp4');

  const renderBackground = (url: string, opacity: string) =>
    isVideo(url) ? (
      <video
        key={url}
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${opacity}`}
      />
    ) : (
      <img
        key={url}
        src={url}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${opacity}`}
      />
    );

  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0 z-0">
        {backgroundUrl && renderBackground(backgroundUrl, fading ? 'opacity-0' : 'opacity-30')}
        {nextBackgroundUrl && renderBackground(nextBackgroundUrl, fading ? 'opacity-30' : 'opacity-0')}
        {cursorGlowTrail && <GradientBlur />}
      </div>

      <div className="relative z-10">
        {/* Content: centered on desktop, bottom-aligned on mobile so the input sits
            just above the app dock with almost no gap */}
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
            {(showWeatherWidget || showNewsWidget) && (
              <div className="flex flex-col gap-2 w-full">
                {/* News sits on top, with the compact weather widget below it.
                    The weather widget is fluid, so it spans the full column
                    width on its own row (current conditions on the left, the
                    next days on the right). */}
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
            )}
            <ChatInputBox />
          </div>
        </div>
      </div>

      <Footer listFooterLinks={footerLinks} />
      <DownloadsDialog open={downloadsOpen} onOpenChange={setDownloadsOpen} />
    </div>
  );
}

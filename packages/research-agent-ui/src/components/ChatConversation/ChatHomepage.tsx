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
  const [trendingNewsApiUrl, setTrendingNewsApiUrl] = useState<string | null>(null);
  const [orbHoverGlow, setOrbHoverGlow] = useState(false);
  // Off by default; enabled via the "Cursor Glow Trail" setting.
  const [cursorGlowTrail, setCursorGlowTrail] = useState(false);
  const footerLinks = researchAgentUIConfig.footerLinks.map((link) =>
    link.url === '/#downloads' ? { ...link, onClick: () => setDownloadsOpen(true) } : link,
  );
  useEffect(() => {
    const readLocations = () => {
      setWeatherLocations(parseWeatherLocations(localStorage.getItem('weatherLocations')));
      setTrendingNewsApiUrl(localStorage.getItem('trendingNewsApiUrl'));
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
      <div className="fixed inset-0 z-0">
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
            <div className="flex flex-col md:flex-row gap-2 w-full">
              <WeatherForecast
                compact
                forecastDays={5}
                forecastHours={12}
                locations={weatherLocations.length > 0 ? weatherLocations : undefined}
                className="rounded-2xl md:flex-1"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'inherit',
                  backdropFilter: 'blur(8px)',
                  maxWidth: '100%',
                }}
              />
              <TrendingNews
                compact
                maxTopics={6}
                apiEndpoint={trendingNewsApiUrl || undefined}
                className="rounded-2xl md:flex-1"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'inherit',
                  backdropFilter: 'blur(8px)',
                  maxWidth: '100%',
                }}
              />
            </div>
            <ChatInputBox />
          </div>
        </div>
      </div>

      <Footer listFooterLinks={footerLinks} />
      <DownloadsDialog open={downloadsOpen} onOpenChange={setDownloadsOpen} />
    </div>
  );
}

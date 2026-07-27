/**
 * Full-screen homepage with a randomised AI-themed background artwork (image or video), the
 * QuantumWaveOrbital animation, recent history chips, the main chat input box, and an app footer.
 */
'use client';
import { useEffect, useState } from 'react';
import { GradientBlur } from '../../ui/gradient-blur';
import ChatInputBox from '../MessageComposer/ChatInputBox';
import RecentHistoryChips from './RecentHistoryChips';
import Footer from '../Footer';
import { useChat } from '../../hooks/useChat';
import { getBackgroundArtwork } from './background-art';
import { researchAgentUIConfig } from '../../config';
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';
import { DownloadAppButton } from 'react-native-app-buttons';
import 'react-native-app-buttons/styles';

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
  const [deviceInfo, setDeviceInfo] = useState({ os: '' });
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) {
        setDeviceInfo({ os: 'Windows' });
      } else if (userAgent.includes('mac')) {
        setDeviceInfo({ os: 'MacOS' });
      } else {
        setDeviceInfo({ os: 'Other' });
      }
    }
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
        <GradientBlur />
      </div>

      <div className="relative z-10">
        {/* Content: centered on desktop, bottom-aligned on mobile so the input sits
            just above the app dock with almost no gap */}
        <div className="flex flex-col items-center justify-end md:justify-center min-h-[calc(100dvh-64px)] md:min-h-screen max-w-screen-sm mx-auto p-2 pb-1 md:pb-2">
          <div style={{ height: '200px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QuantumWaveOrbital
              autoRandomize={true}
              onSphereClick={() => console.log('Sphere clicked')}
              className="my-custom-class"
            />
          </div>

          <p className="text-lg text-gray-500 text-center justify-center mt-4">
            <a
              aria-label="Chrome Web Store"
              className="download-chrome download-btn text-center justify-center"
              target="_blank"
              href={researchAgentUIConfig.downloadChromeUrl}
            >
            </a>

            <a
              aria-label="Microsoft Store"
              className="download-windows download-btn text-center justify-center"
              target="_blank"
              href={deviceInfo.os == "Windows"
                ? `ms-windows-store://pdp/?productid=${researchAgentUIConfig.downloadWindowsStoreId}`
                : `https://apps.microsoft.com/detail/${researchAgentUIConfig.downloadWindowsStoreId}?rtc=1`
              }
            >
            </a>
          </p>
          <div className="w-full max-w-2xl mt-8 space-y-2">
            <RecentHistoryChips />
            <ChatInputBox />
          </div>
        </div>
      </div>

      <Footer listFooterLinks={researchAgentUIConfig.footerLinks} />
    </div>
  );
}

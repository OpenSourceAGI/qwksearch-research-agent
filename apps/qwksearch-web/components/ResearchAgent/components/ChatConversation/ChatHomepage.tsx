/**
 * Full-screen homepage with a randomised AI-themed background artwork (image or video), the
 * QuantumWaveOrbital animation, recent history chips, the main chat input box, and an app footer.
 */
'use client';
import { useEffect, useState } from 'react';
import { GradientBlur } from '@/components/ui/gradient-blur';
import ChatInputBox from '../MessageComposer/ChatInputBox';
import RecentHistoryChips from './RecentHistoryChips';
import Footer from '@/components/layout/Footer';
import { useChat } from '@/components/ResearchAgent/hooks/useChat';
import { getBackgroundArtwork } from './background-art';
import * as config from '@/lib/config/site';
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';

/**
 * The homepage component for the chat interface.
 * Displays a background artwork (image or video), a settings button,
 * and the main chat input box fixed at the bottom of the screen.
 */
export default function ChatHomepage() {
  const { sendMessage } = useChat();
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({ os: '' });
  useEffect(() => {
    const showBg = localStorage.getItem('showBackgroundArt');
    if (showBg !== 'false') {
      setBackgroundUrl(getBackgroundArtwork());
    }
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

  const isVideo = backgroundUrl && (backgroundUrl.endsWith('.webm') || backgroundUrl.endsWith('.mp4'));

  return (
    <div className="relative min-h-screen w-full">
      <div className="fixed inset-0 z-0">
        {backgroundUrl && (
          isVideo ? (
            <video
              src={backgroundUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-30"
            />
          ) : (
            <img
              src={backgroundUrl}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
          )
        )}
        <GradientBlur />
      </div>

      <div className="relative z-10">
        {/* <div className="absolute w-full flex flex-row items-center justify-end pr-5 pt-2 sm:pt-5">
          <SettingsButtonMobile />
        </div> */}
        {/* Centered content with input in the middle of the page */}
        <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2">
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
              href={config.DOWNLOAD_CHROME_URL}
            >
            </a>

            <a
              aria-label="Microsoft Store"
              className="download-windows download-btn text-center justify-center"
              target="_blank"
              href={deviceInfo.os == "Windows"
                ? `ms-windows-store://pdp/?productid=${config.DOWNLOAD_WINDOWS_STORE_ID}`
                : `https://apps.microsoft.com/detail/${config.DOWNLOAD_WINDOWS_STORE_ID}?rtc=1`
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

      <Footer listFooterLinks={config.listFooterLinks} />
    </div>
  );
}

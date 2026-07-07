import { useEffect, useRef, useState } from 'react';
import { cropProviderAsDataURL, Provider } from 'chat-agent-toolkit';
import { Plug2 } from 'lucide-react';

interface ProviderIconProps {
  providerType: string;
  size?: number;
  className?: string;
}

const ProviderIcon = ({
  providerType,
  size = 14,
  className = '',
}: ProviderIconProps) => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadProviderIcon = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const img = new Image();
        img.src = '/images/providers-sprite.png';
        await img.decode();

        const normalizedProvider = providerType.toLowerCase() as Provider;
        const dataUrl = await cropProviderAsDataURL(img, normalizedProvider);
        setIconUrl(dataUrl);
      } catch (error) {
        console.error('Failed to load provider icon:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviderIcon();
  }, [providerType]);

  if (isLoading || hasError || !iconUrl) {
    return (
      <div className={`p-1.5 rounded-md bg-sky-500/10 dark:bg-sky-500/10 ${className}`}>
        <Plug2 size={size} className="text-sky-500" />
      </div>
    );
  }

  return (
    <div className={`p-1.5 rounded-md bg-white/50 dark:bg-white/10 ${className}`}>
      <img
        src={iconUrl}
        alt={`${providerType} logo`}
        width={size}
        height={size}
        className="object-contain"
      />
    </div>
  );
};

export default ProviderIcon;

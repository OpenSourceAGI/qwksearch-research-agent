import type { CreateClientConfig } from './src/client.gen';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: use the app's current origin
    const baseUrl = (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_BASE_URL) ||
                    `${window.location.protocol}//${window.location.host}`;
    return `${baseUrl}/api`;
  }
  // Server: use NEXT_PUBLIC_BASE_URL or fallback to main domain
  return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://qwksearch.com'}/api`;
};

export const baseUrl = getBaseUrl();

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl,
});
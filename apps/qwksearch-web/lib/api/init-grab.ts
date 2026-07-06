/**
 * @fileoverview Initialize grab-url with default configuration.
 * Sets credentials: 'include' by default for all requests to ensure
 * authentication cookies are sent.
 */
import grab from 'grab-url';

/**
 * Configure grab-url to include credentials by default.
 * This ensures session cookies are sent with all API requests.
 */
if (typeof window !== 'undefined') {
  // Set default configuration for all grab requests
  grab('', {
    setDefaults: true,
    credentials: 'include' as RequestCredentials,
  });
}

// Type augmentation for window.grab
declare global {
  interface Window {
    grab?: {
      defaults?: Record<string, any>;
      mock?: Record<string, any>;
      log?: any[];
      instance?: (defaults: Record<string, any>) => (...args: any[]) => any;
    };
  }
}

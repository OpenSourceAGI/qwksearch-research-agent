/**
 * @fileoverview Wrapper around grab-url that automatically includes credentials
 * for authenticated API requests. This ensures session cookies are sent with
 * all requests to the backend API.
 */
import grabUrl from 'grab-url';

/**
 * Enhanced grab function that includes credentials by default.
 * This ensures authentication cookies are sent with API requests.
 *
 * @param url - The API endpoint URL
 * @param options - Fetch options (credentials: 'include' is added by default)
 * @returns Promise with the response data
 */
export default async function grab(
  url: string,
  options?: RequestInit & Record<string, any>
): Promise<any> {
  // Merge default credentials option with provided options
  const enhancedOptions = {
    credentials: 'include' as RequestCredentials,
    ...options,
  };

  return grabUrl(url, enhancedOptions);
}

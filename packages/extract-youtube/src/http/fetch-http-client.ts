/**
 * @fileoverview HTTP client implementation using grab-url
 */

import grab from 'grab-url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpClient, RequestsProxyConfigDict } from '../types';

/**
 * Simple HTTP client implementation using grab-url with proxy support.
 * This client handles HTTP/HTTPS requests with configurable headers and proxy settings.
 *
 * @internal
 */
export class FetchHttpClient implements HttpClient {
  private requestHeaders: Record<string, string> = {};
  private proxyConfiguration: Partial<RequestsProxyConfigDict> = {};

  /**
   * Creates a new FetchHttpClient instance.
   * Sets default Accept-Language header to English.
   */
  constructor() {
    this.requestHeaders['Accept-Language'] = 'en-US';
  }

  /**
   * Sets a custom header for all requests.
   *
   * @param {string} headerName - The header name
   * @param {string} headerValue - The header value
   */
  setHeader(headerName: string, headerValue: string): void {
    this.requestHeaders[headerName] = headerValue;
  }

  /**
   * Configures proxy settings for all requests.
   *
   * @param {RequestsProxyConfigDict} proxies - Proxy configuration dictionary
   */
  setProxies(proxies: RequestsProxyConfigDict): void {
    this.proxyConfiguration = proxies;
  }

  /**
   * Performs an HTTP GET request.
   *
   * @param {string} url - The URL to request
   * @param {RequestInit} [options] - Additional request options
   * @returns {Promise<Response>} The HTTP response
   */
  async get(url: string, options?: RequestInit): Promise<Response> {
    const proxyAgent = this.getProxyAgentForUrl(url);
    return grab(url, {
      ...options,
      method: 'GET',
      headers: { ...this.requestHeaders, ...(options?.headers as Record<string, string>) },
      agent: proxyAgent
    } as any);
  }

  /**
   * Performs an HTTP POST request.
   *
   * @param {string} url - The URL to request
   * @param {RequestInit} [options] - Additional request options
   * @returns {Promise<Response>} The HTTP response
   */
  async post(url: string, options?: RequestInit): Promise<Response> {
    const proxyAgent = this.getProxyAgentForUrl(url);
    return grab(url, {
      ...options,
      method: 'POST',
      headers: { ...this.requestHeaders, ...(options?.headers as Record<string, string>) },
      agent: proxyAgent
    } as any);
  }

  /**
   * Gets the appropriate proxy agent for a given URL.
   *
   * @private
   * @param {string} url - The URL being requested
   * @returns {any} The proxy agent or undefined if no proxy is configured
   */
  private getProxyAgentForUrl(url: string): any {
    if (Object.keys(this.proxyConfiguration).length === 0) {
      return undefined;
    }

    const proxyUrl = url.startsWith('https://')
      ? this.proxyConfiguration.https
      : this.proxyConfiguration.http;

    if (!proxyUrl) {
      return undefined;
    }

    return new HttpsProxyAgent(proxyUrl);
  }
}

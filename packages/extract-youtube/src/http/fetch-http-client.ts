/**
 * @fileoverview HTTP client implementation on the platform `fetch`
 *
 * Every caller (`TranscriptListFetcher`, `Transcript.fetch`) reads the result
 * as a WHATWG `Response`: `status`, `ok`, `text()`, `json()`. It has to be the
 * real `fetch`, which exists on Node 18+, Workers, Vercel and browsers. A
 * wrapper that returns a parsed body instead (grab-url did) leaves `status`
 * undefined, so `handleHttpErrors` rejects every request and no transcript
 * ever loads.
 */

import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpClient, RequestsProxyConfigDict } from '../types';

/**
 * Simple HTTP client implementation using `fetch`, with proxy support.
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
    return fetch(url, {
      ...options,
      method: 'GET',
      headers: { ...this.requestHeaders, ...(options?.headers as Record<string, string>) },
      // Read by node-fetch style polyfills; the platform fetch ignores it.
      agent: proxyAgent
    } as RequestInit);
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
    return fetch(url, {
      ...options,
      method: 'POST',
      headers: { ...this.requestHeaders, ...(options?.headers as Record<string, string>) },
      // Read by node-fetch style polyfills; the platform fetch ignores it.
      agent: proxyAgent
    } as RequestInit);
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

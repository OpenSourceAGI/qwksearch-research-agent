/**
 * @fileoverview Proxy configuration classes for the YouTube Transcript API
 */

import { RequestsProxyConfigDict } from './types';

/**
 * Exception for invalid proxy configurations
 */
export class InvalidProxyConfig extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProxyConfig';
    Object.setPrototypeOf(this, InvalidProxyConfig.prototype);
  }
}

/**
 * Base class for all proxy configurations.
 * Any proxy config can be used as long as it can be converted to a RequestsProxyConfigDict.
 */
export abstract class ProxyConfig {
  /**
   * Converts this proxy config to a dictionary that can be used by HTTP clients.
   * @returns {RequestsProxyConfigDict} The proxy configuration dictionary
   */
  abstract toRequestsDict(): RequestsProxyConfigDict;

  /**
   * If you are using rotating proxies, it can be useful to prevent the HTTP
   * client from keeping TCP connections alive, as your IP won't be rotated on
   * every request if your connection stays open.
   * @returns {boolean} Whether to prevent keeping connections alive
   */
  get preventKeepingConnectionsAlive(): boolean {
    return false;
  }

  /**
   * Defines how many times we should retry if a request is blocked. When using
   * rotating residential proxies with a large IP pool it can make sense to retry a
   * couple of times when a blocked IP is encountered, since a retry will trigger
   * an IP rotation and the next IP might not be blocked.
   * @returns {number} Number of retries when blocked
   */
  get retriesWhenBlocked(): number {
    return 0;
  }
}

/**
 * Generic proxy configuration that can be used to set up any HTTP/HTTPS/SOCKS proxy.
 *
 * If only an HTTP or an HTTPS proxy is provided, it will be used for both types of
 * connections. However, you will have to provide at least one of the two.
 *
 * @example
 * ```typescript
 * const proxyConfig = new GenericProxyConfig({
 *   httpUrl: 'http://user:pass@proxy.example.com:8080',
 *   httpsUrl: 'https://user:pass@proxy.example.com:8080'
 * });
 * ```
 */
export class GenericProxyConfig extends ProxyConfig {
  protected _httpUrl: string | null;
  protected _httpsUrl: string | null;

  /**
   * Creates a generic proxy configuration.
   * If only an HTTP or an HTTPS proxy is provided, it will be used for both types of
   * connections. However, you will have to provide at least one of the two.
   *
   * @param {Object} options - Proxy configuration options
   * @param {string} [options.httpUrl] - The proxy URL used for HTTP requests. Defaults to httpsUrl if not provided.
   * @param {string} [options.httpsUrl] - The proxy URL used for HTTPS requests. Defaults to httpUrl if not provided.
   * @throws {InvalidProxyConfig} If neither httpUrl nor httpsUrl is provided
   */
  constructor(options: { httpUrl?: string; httpsUrl?: string }) {
    super();
    const { httpUrl, httpsUrl } = options;

    if (!httpUrl && !httpsUrl) {
      throw new InvalidProxyConfig(
        'GenericProxyConfig requires you to define at least one of the two: http or https'
      );
    }

    this._httpUrl = httpUrl || null;
    this._httpsUrl = httpsUrl || null;
  }

  get httpUrl(): string | null {
    return this._httpUrl;
  }

  get httpsUrl(): string | null {
    return this._httpsUrl;
  }

  toRequestsDict(): RequestsProxyConfigDict {
    return {
      http: this.httpUrl || this.httpsUrl!,
      https: this.httpsUrl || this.httpUrl!
    };
  }
}

/**
 * Webshare proxy configuration for rotating residential proxies.
 *
 * Webshare is a provider offering rotating residential proxies, which is the
 * most reliable way to work around being blocked by YouTube.
 *
 * If you don't have a Webshare account yet, you will have to create one
 * at https://www.webshare.io/?referral_code=w0xno53eb50g and purchase a "Residential"
 * proxy package that suits your workload (make sure NOT to purchase "Proxy Server"
 * or "Static Residential"!).
 *
 * Once you have created an account you only need the "Proxy Username" and
 * "Proxy Password" that you can find in your Webshare settings to set up this config.
 *
 * @example
 * ```typescript
 * const proxyConfig = new WebshareProxyConfig({
 *   proxyUsername: 'your-username',
 *   proxyPassword: 'your-password',
 *   filterIpLocations: ['us', 'de']
 * });
 * ```
 */
export class WebshareProxyConfig extends GenericProxyConfig {
  public static readonly DEFAULT_DOMAIN_NAME = 'p.webshare.io';
  public static readonly DEFAULT_PORT = 80;

  public readonly proxyUsername: string;
  public readonly proxyPassword: string;
  public readonly domainName: string;
  public readonly proxyPort: number;
  private readonly filterIpLocations: string[];
  private readonly _retriesWhenBlocked: number;

  /**
   * Creates a Webshare proxy configuration.
   *
   * Once you have created a Webshare account and purchased a "Residential" package
   * (make sure NOT to purchase "Proxy Server" or "Static Residential"!), this config
   * class allows you to easily use it by defaulting to the most reliable proxy settings
   * (rotating residential proxies).
   *
   * @param {Object} options - Webshare configuration options
   * @param {string} options.proxyUsername - "Proxy Username" found at https://dashboard.webshare.io/proxy/settings
   * @param {string} options.proxyPassword - "Proxy Password" found at https://dashboard.webshare.io/proxy/settings
   * @param {string[]} [options.filterIpLocations] - If you want to limit the pool of IPs to specific countries,
   *   provide a list of location codes (e.g., ['us', 'de']). This can reduce latency and work around location-based restrictions.
   * @param {number} [options.retriesWhenBlocked=10] - How many times to retry if a request is blocked
   * @param {string} [options.domainName] - Custom domain name (defaults to p.webshare.io)
   * @param {number} [options.proxyPort] - Custom proxy port (defaults to 80)
   */
  constructor(options: {
    proxyUsername: string;
    proxyPassword: string;
    filterIpLocations?: string[];
    retriesWhenBlocked?: number;
    domainName?: string;
    proxyPort?: number;
  }) {
    super({ httpUrl: 'placeholder' });

    this.proxyUsername = options.proxyUsername;
    this.proxyPassword = options.proxyPassword;
    this.domainName = options.domainName || WebshareProxyConfig.DEFAULT_DOMAIN_NAME;
    this.proxyPort = options.proxyPort || WebshareProxyConfig.DEFAULT_PORT;
    this.filterIpLocations = options.filterIpLocations || [];
    this._retriesWhenBlocked = options.retriesWhenBlocked ?? 10;
  }

  /**
   * Gets the full proxy URL with location filtering and rotation settings.
   * @returns {string} The complete proxy URL
   */
  get url(): string {
    const locationCodes = this.filterIpLocations
      .map(code => `-${code.toUpperCase()}`)
      .join('');

    let username = this.proxyUsername;
    const suffix = '-rotate';

    if (username.endsWith(suffix)) {
      username = username.slice(0, -suffix.length);
    }

    return (
      `http://${username}${locationCodes}${suffix}:${this.proxyPassword}` +
      `@${this.domainName}:${this.proxyPort}/`
    );
  }

  get httpUrl(): string {
    return this.url;
  }

  get httpsUrl(): string {
    return this.url;
  }

  toRequestsDict(): RequestsProxyConfigDict {
    return {
      http: this.url,
      https: this.url
    };
  }

  get preventKeepingConnectionsAlive(): boolean {
    return true;
  }

  get retriesWhenBlocked(): number {
    return this._retriesWhenBlocked;
  }
}

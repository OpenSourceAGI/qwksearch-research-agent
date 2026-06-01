/**
 * @fileoverview Main API class for the YouTube Transcript API
 */

import { ProxyConfig } from './proxies';
import { FetchedTranscript, TranscriptList } from './models';
import { TranscriptListFetcher } from './fetchers/transcript-list-fetcher';
import { HttpClient } from './types';
import { FetchHttpClient } from './http/fetch-http-client';

/**
 * Main API class for retrieving YouTube transcripts.
 * This is the primary entry point for the library.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const api = new YouTubeTranscriptApi();
 * const transcript = await api.fetchTranscript('video_id');
 *
 * // With language preference
 * const transcript = await api.fetchTranscript('video_id', { languages: ['de', 'en'] });
 *
 * // With proxy
 * import { GenericProxyConfig } from 'youtube-transcript-api';
 * const api = new YouTubeTranscriptApi({
 *   proxyConfig: new GenericProxyConfig({
 *     httpUrl: 'http://user:pass@proxy.example.com:8080'
 *   })
 * });
 * ```
 */
export class YouTubeTranscriptApi {
  private transcriptListFetcher: TranscriptListFetcher;

  /**
   * Creates a new YouTubeTranscriptApi instance.
   *
   * Note on thread-safety: As this class initializes an HTTP client,
   * it is not thread-safe. Make sure to initialize an instance per
   * thread if used in a multi-threading scenario!
   *
   * @param {Object} [options] - Configuration options
   * @param {ProxyConfig} [options.proxyConfig] - An optional ProxyConfig object defining proxies
   *   used for all network requests. This can be used to work around your IP being blocked
   *   by YouTube, as described in the "Working around IP bans" section of the README.
   * @param {HttpClient} [options.httpClient] - You can optionally pass in a custom HTTP client
   *   if you want to share state between different instances of YouTubeTranscriptApi or
   *   customize request behavior.
   *
   * @example
   * ```typescript
   * // Basic usage
   * const api = new YouTubeTranscriptApi();
   *
   * // With Webshare proxy
   * import { WebshareProxyConfig } from 'youtube-transcript-api';
   * const api = new YouTubeTranscriptApi({
   *   proxyConfig: new WebshareProxyConfig({
   *     proxyUsername: 'your-username',
   *     proxyPassword: 'your-password',
   *     filterIpLocations: ['us', 'de']
   *   })
   * });
   *
   * // With generic proxy
   * import { GenericProxyConfig } from 'youtube-transcript-api';
   * const api = new YouTubeTranscriptApi({
   *   proxyConfig: new GenericProxyConfig({
   *     httpUrl: 'http://user:pass@proxy.example.com:8080',
   *     httpsUrl: 'https://user:pass@proxy.example.com:8080'
   *   })
   * });
   * ```
   */
  constructor(options?: { proxyConfig?: ProxyConfig; httpClient?: HttpClient }) {
    const httpClient = this.initializeHttpClient(options);
    this.configureHttpClientWithProxy(httpClient, options?.proxyConfig);
    this.transcriptListFetcher = new TranscriptListFetcher(httpClient, options?.proxyConfig || null);
  }

  /**
   * Initializes the HTTP client from options or creates a default one.
   *
   * @private
   * @param {Object} [options] - Configuration options
   * @returns {HttpClient} The initialized HTTP client
   */
  private initializeHttpClient(options?: { httpClient?: HttpClient }): HttpClient {
    return options?.httpClient || new FetchHttpClient();
  }

  /**
   * Configures the HTTP client with proxy settings if provided.
   *
   * @private
   * @param {HttpClient} httpClient - The HTTP client to configure
   * @param {ProxyConfig} [proxyConfig] - Optional proxy configuration
   */
  private configureHttpClientWithProxy(httpClient: HttpClient, proxyConfig?: ProxyConfig): void {
    if (!proxyConfig || !(httpClient instanceof FetchHttpClient)) {
      return;
    }

    const proxyDictionary = proxyConfig.toRequestsDict();
    httpClient.setProxies(proxyDictionary);

    if (proxyConfig.preventKeepingConnectionsAlive) {
      httpClient.setHeader('Connection', 'close');
    }

    // Note: Retry logic for 429 status codes with configured retries
    // would need to be implemented in the HTTP client or fetcher
  }

  /**
   * Retrieves the transcript for a single video.
   * This is a shortcut for calling:
   * `api.listTranscripts(videoId).then(list => list.findTranscript(languages)).then(t => t.fetch())`
   *
   * @param {string} videoId - The ID of the video you want to retrieve the transcript for.
   *   Make sure that this is the actual ID, NOT the full URL to the video!
   * @param {Object} [options] - Fetch options
   * @param {string[]} [options.languages=['en']] - A list of language codes in descending priority.
   *   For example, if this is set to ['de', 'en'] it will first try to fetch the german
   *   transcript (de) and then fetch the english transcript (en) if it fails to do so.
   * @param {boolean} [options.preserveFormatting=false] - Whether to keep select HTML text formatting
   * @returns {Promise<FetchedTranscript>} The fetched transcript
   *
   * @example
   * ```typescript
   * const api = new YouTubeTranscriptApi();
   *
   * // Fetch English transcript
   * const transcript = await api.fetchTranscript('dQw4w9WgXcQ');
   *
   * // Fetch with language preference
   * const transcript = await api.fetchTranscript('dQw4w9WgXcQ', {
   *   languages: ['de', 'en']
   * });
   *
   * // Preserve HTML formatting
   * const transcript = await api.fetchTranscript('dQw4w9WgXcQ', {
   *   preserveFormatting: true
   * });
   *
   * // Iterate over snippets
   * for (const snippet of transcript) {
   *   console.log(`${snippet.start}s: ${snippet.text}`);
   * }
   * ```
   */
  async fetchTranscript(
    videoId: string,
    options?: {
      languages?: string[];
      preserveFormatting?: boolean;
    }
  ): Promise<FetchedTranscript> {
    const preferredLanguages = options?.languages || ['en'];
    const preserveFormatting = options?.preserveFormatting || false;

    const transcriptList = await this.listTranscripts(videoId);
    const transcript = transcriptList.findTranscript(preferredLanguages);
    return transcript.fetch(preserveFormatting);
  }

  /**
   * Retrieves the list of transcripts which are available for a given video.
   * It returns a TranscriptList object which is iterable and provides methods to
   * filter the list of transcripts for specific languages.
   *
   * While iterating over the TranscriptList, the individual transcripts are
   * represented by Transcript objects, which provide metadata and can either
   * be fetched by calling transcript.fetch() or translated by calling
   * transcript.translate('en').
   *
   * @param {string} videoId - The ID of the video you want to retrieve the transcript for.
   *   Make sure that this is the actual ID, NOT the full URL to the video!
   * @returns {Promise<TranscriptList>} A list of available transcripts
   *
   * @example
   * ```typescript
   * const api = new YouTubeTranscriptApi();
   *
   * // Retrieve available transcripts
   * const transcriptList = await api.listTranscripts('video_id');
   *
   * // Iterate over all available transcripts
   * for (const transcript of transcriptList) {
   *   console.log(
   *     transcript.videoId,
   *     transcript.language,
   *     transcript.languageCode,
   *     transcript.isGenerated,
   *     transcript.isTranslatable,
   *     transcript.translationLanguages
   *   );
   *
   *   // Fetch the actual transcript data
   *   const fetched = await transcript.fetch();
   *   console.log(fetched);
   *
   *   // Translate the transcript
   *   if (transcript.isTranslatable) {
   *     const translated = transcript.translate('de');
   *     const fetchedTranslated = await translated.fetch();
   *     console.log(fetchedTranslated);
   *   }
   * }
   *
   * // Filter for specific language
   * const transcript = transcriptList.findTranscript(['de', 'en']);
   *
   * // Filter for manually created transcripts
   * const manual = transcriptList.findManuallyCreatedTranscript(['de', 'en']);
   *
   * // Filter for automatically generated transcripts
   * const generated = transcriptList.findGeneratedTranscript(['de', 'en']);
   * ```
   */
  async listTranscripts(videoId: string): Promise<TranscriptList> {
    return this.transcriptListFetcher.fetchTranscriptList(videoId);
  }

  /**
   * Alias for fetchTranscript() for backward compatibility.
   *
   * @deprecated Use fetchTranscript() instead
   * @param {string} videoId - The video ID
   * @param {Object} [options] - Fetch options
   * @returns {Promise<FetchedTranscript>} The fetched transcript
   */
  async fetch(
    videoId: string,
    options?: {
      languages?: string[];
      preserveFormatting?: boolean;
    }
  ): Promise<FetchedTranscript> {
    return this.fetchTranscript(videoId, options);
  }

  /**
   * Alias for listTranscripts() for backward compatibility.
   *
   * @deprecated Use listTranscripts() instead
   * @param {string} videoId - The video ID
   * @returns {Promise<TranscriptList>} A list of available transcripts
   */
  async list(videoId: string): Promise<TranscriptList> {
    return this.listTranscripts(videoId);
  }
}

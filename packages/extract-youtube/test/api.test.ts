/**
 * @fileoverview Unit tests for YouTubeTranscriptApi
 */

import { YouTubeTranscriptApi } from '../src/youtube-transcript-api';
import { GenericProxyConfig, WebshareProxyConfig } from '../src/proxies';
import { FetchedTranscript, TranscriptList } from '../src/models';
import {
  TranscriptsDisabled,
  NoTranscriptFound,
  VideoUnavailable,
  RequestBlocked
} from '../src/errors';

describe('YouTubeTranscriptApi', () => {
  let api: YouTubeTranscriptApi;

  beforeEach(() => {
    api = new YouTubeTranscriptApi();
  });

  describe('constructor', () => {
    it('should create instance with or without options', () => {
      expect(api).toBeInstanceOf(YouTubeTranscriptApi);

      const proxyConfig = new GenericProxyConfig({
        httpUrl: 'http://proxy.example.com:8080'
      });
      const apiWithProxy = new YouTubeTranscriptApi({ proxyConfig });
      expect(apiWithProxy).toBeInstanceOf(YouTubeTranscriptApi);
    });
  });

  describe('fetch', () => {
    it('should have fetch method and accept options', () => {
      expect(api.fetch).toBeDefined();
      expect(typeof api.fetch).toBe('function');

      const fetchPromise = api.fetch('test-video-id', {
        languages: ['en', 'de'],
        preserveFormatting: true
      });

      expect(fetchPromise).toBeInstanceOf(Promise);
    });
  });

  describe('list', () => {
    it('should have list method defined', () => {
      expect(api.list).toBeDefined();
      expect(typeof api.list).toBe('function');
    });

    it('should return a promise', () => {
      const listPromise = api.list('test-video-id');
      expect(listPromise).toBeInstanceOf(Promise);
    });
  });
});

describe('FetchedTranscript', () => {
  const mockSnippets = [
    { text: 'Hello', start: 0, duration: 1 },
    { text: 'World', start: 1, duration: 1 }
  ];

  let transcript: FetchedTranscript;

  beforeEach(() => {
    transcript = new FetchedTranscript(
      mockSnippets,
      'test-video-id',
      'English',
      'en',
      false
    );
  });

  it('should create transcript instance with correct properties and methods', () => {
    expect(transcript).toBeInstanceOf(FetchedTranscript);
    expect(transcript.videoId).toBe('test-video-id');
    expect(transcript.language).toBe('English');
    expect(transcript.languageCode).toBe('en');
    expect(transcript.isGenerated).toBe(false);
    expect(transcript.length).toBe(2);

    // Test iteration
    const snippets = [...transcript];
    expect(snippets).toHaveLength(2);
    expect(snippets[0].text).toBe('Hello');

    // Test array access
    expect(transcript.get(0).text).toBe('Hello');

    // Test raw data conversion
    const rawData = transcript.toRawData();
    expect(rawData).toEqual(mockSnippets);
  });
});

describe('Error Classes', () => {
  it('should create error instances with correct properties', () => {
    const transcriptsDisabled = new TranscriptsDisabled('test-video-id');
    expect(transcriptsDisabled).toBeInstanceOf(TranscriptsDisabled);
    expect(transcriptsDisabled.videoId).toBe('test-video-id');
    expect(transcriptsDisabled.message).toContain('Subtitles are disabled');

    const videoUnavailable = new VideoUnavailable('test-video-id');
    expect(videoUnavailable).toBeInstanceOf(VideoUnavailable);
    expect(videoUnavailable.message).toContain('no longer available');

    const requestBlocked = new RequestBlocked('test-video-id');
    expect(requestBlocked).toBeInstanceOf(RequestBlocked);
    expect(requestBlocked.message).toContain('blocking requests');
  });

  it('should update RequestBlocked message with proxy config', () => {
    const error = new RequestBlocked('test-video-id');
    const proxyConfig = new GenericProxyConfig({
      httpUrl: 'http://proxy.example.com'
    });

    error.withProxyConfig(proxyConfig);
    expect(error.message).toContain('despite you using proxies');
  });
});

describe('ProxyConfig', () => {
  it('should create and configure GenericProxyConfig', () => {
    const config = new GenericProxyConfig({
      httpUrl: 'http://proxy.example.com:8080',
      httpsUrl: 'https://proxy.example.com:8080'
    });

    const dict = config.toRequestsDict();
    expect(dict.http).toBe('http://proxy.example.com:8080');
    expect(dict.https).toBe('https://proxy.example.com:8080');

    expect(() => {
      new GenericProxyConfig({});
    }).toThrow('requires you to define at least one');
  });

  it('should create and configure WebshareProxyConfig', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'test-user',
      proxyPassword: 'test-pass',
      filterIpLocations: ['us', 'de'],
      retriesWhenBlocked: 5
    });

    expect(config.proxyUsername).toBe('test-user');
    expect(config.proxyPassword).toBe('test-pass');
    expect(config.retriesWhenBlocked).toBe(5);
    expect(config.preventKeepingConnectionsAlive).toBe(true);

    const url = config.url;
    expect(url).toContain('test-user');
    expect(url).toContain('test-pass');
    expect(url).toContain('p.webshare.io');
    expect(url).toContain('-US-DE-rotate');
  });
});

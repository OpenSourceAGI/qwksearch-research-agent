/**
 * @fileoverview Unit tests for Formatter classes
 */

import {
  Formatter,
  JSONFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter,
  PrettyPrintFormatter,
  FormatterLoader,
  UnknownFormatterType
} from '../src/formatters';
import { FetchedTranscript } from '../src/models';

describe('Formatters', () => {
  const mockSnippets = [
    { text: 'Hello there', start: 0.0, duration: 1.5 },
    { text: 'How are you', start: 1.5, duration: 2.0 },
    { text: 'Goodbye', start: 3.5, duration: 1.0 }
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

  describe('JSONFormatter', () => {
    it('should format transcript as JSON', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].text).toBe('Hello there');
      expect(parsed[0].start).toBe(0.0);
      expect(parsed[0].duration).toBe(1.5);
    });

    it('should format with indentation', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscript(transcript, { indent: 2 });

      expect(result).toContain('  "text"');
      expect(result).toContain('\n');
    });

    it('should format multiple transcripts', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscripts([transcript, transcript]);

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
    });
  });

  describe('TextFormatter', () => {
    it('should format transcript as plain text', () => {
      const formatter = new TextFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toBe('Hello there\nHow are you\nGoodbye');
      expect(result).not.toContain('0.0');
      expect(result).not.toContain('duration');
    });

    it('should format multiple transcripts', () => {
      const formatter = new TextFormatter();
      const result = formatter.formatTranscripts([transcript, transcript]);

      expect(result).toContain('\n\n\n');
    });
  });

  describe('SRTFormatter', () => {
    it('should format transcript as SRT', () => {
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toContain('1\n');
      expect(result).toContain('00:00:00,000 --> 00:00:01,500');
      expect(result).toContain('Hello there');
      expect(result).toContain('2\n');
      expect(result).toContain('00:00:01,500 --> 00:00:03,500');
      expect(result).toContain('How are you');
    });

    it('should use comma as millisecond separator', () => {
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
    });

    it('should end with newline', () => {
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result.endsWith('\n')).toBe(true);
    });
  });

  describe('WebVTTFormatter', () => {
    it('should format transcript as WebVTT', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toContain('WEBVTT\n');
      expect(result).toContain('00:00:00.000 --> 00:00:01.500');
      expect(result).toContain('Hello there');
      expect(result).toContain('00:00:01.500 --> 00:00:03.500');
      expect(result).toContain('How are you');
    });

    it('should use period as millisecond separator', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it('should start with WEBVTT header', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result.startsWith('WEBVTT\n')).toBe(true);
    });
  });

  describe('PrettyPrintFormatter', () => {
    it('should format transcript in pretty format', () => {
      const formatter = new PrettyPrintFormatter();
      const result = formatter.formatTranscript(transcript);

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(3);
      expect(result).toContain('\n');
    });
  });

  describe('FormatterLoader', () => {
    let loader: FormatterLoader;

    beforeEach(() => {
      loader = new FormatterLoader();
    });

    it('should load json formatter', () => {
      const formatter = loader.load('json');
      expect(formatter).toBeInstanceOf(JSONFormatter);
    });

    it('should load text formatter', () => {
      const formatter = loader.load('text');
      expect(formatter).toBeInstanceOf(TextFormatter);
    });

    it('should load srt formatter', () => {
      const formatter = loader.load('srt');
      expect(formatter).toBeInstanceOf(SRTFormatter);
    });

    it('should load webvtt formatter', () => {
      const formatter = loader.load('webvtt');
      expect(formatter).toBeInstanceOf(WebVTTFormatter);
    });

    it('should load pretty formatter', () => {
      const formatter = loader.load('pretty');
      expect(formatter).toBeInstanceOf(PrettyPrintFormatter);
    });

    it('should default to pretty formatter', () => {
      const formatter = loader.load();
      expect(formatter).toBeInstanceOf(PrettyPrintFormatter);
    });

    it('should throw error for unknown formatter type', () => {
      expect(() => {
        loader.load('unknown');
      }).toThrow(UnknownFormatterType);
    });

    it('should list available types in error', () => {
      try {
        loader.load('invalid');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(UnknownFormatterType);
        expect((error as Error).message).toContain('json');
        expect((error as Error).message).toContain('text');
        expect((error as Error).message).toContain('srt');
      }
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format hours correctly', () => {
      const longTranscript = new FetchedTranscript(
        [{ text: 'Test', start: 3661.5, duration: 1.0 }],
        'test',
        'English',
        'en',
        false
      );

      const srtFormatter = new SRTFormatter();
      const srt = srtFormatter.formatTranscript(longTranscript);
      expect(srt).toContain('01:01:01,500');

      const webvttFormatter = new WebVTTFormatter();
      const webvtt = webvttFormatter.formatTranscript(longTranscript);
      expect(webvtt).toContain('01:01:01.500');
    });

    it('should pad numbers with zeros', () => {
      const transcript = new FetchedTranscript(
        [{ text: 'Test', start: 5.5, duration: 1.0 }],
        'test',
        'English',
        'en',
        false
      );

      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(transcript);
      expect(result).toContain('00:00:05,500');
    });
  });
});

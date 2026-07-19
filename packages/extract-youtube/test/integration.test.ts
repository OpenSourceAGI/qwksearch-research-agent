/**
 * @fileoverview Integration tests for YouTube Transcript API
 *
 * These tests fetch real transcripts from YouTube.
 */

import { YouTubeTranscriptApi } from "../src/youtube-transcript-api";
import { GenericProxyConfig } from "../src/proxies";
import { SRTFormatter, WebVTTFormatter } from "../src/formatters";
import {
  NoTranscriptFound,
  InvalidVideoId,
} from "../src/errors";

describe("Integration Tests", () => {
  let api: YouTubeTranscriptApi;

  beforeEach(() => {
    api = new YouTubeTranscriptApi();
  });

  describe.skip("Real video fetching", () => {
    it("should fetch transcript for a public video", async () => {
      // Using a video that typically has English subtitles
      const videoId = "jNQXAC9IVRw"; // "Me at the zoo" - first YouTube video

      const transcript = await api.fetch(videoId);

      expect(transcript.videoId).toBe(videoId);
      expect(transcript.snippets.length).toBeGreaterThan(0);
      expect(transcript.language).toBeDefined();
      expect(transcript.languageCode).toBeDefined();

      // Verify snippet structure
      const firstSnippet = transcript.get(0);
      expect(firstSnippet.text).toBeDefined();
      expect(typeof firstSnippet.start).toBe("number");
      expect(typeof firstSnippet.duration).toBe("number");
    }, 30000); // 30 second timeout for network request

    it("should list available transcripts", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcriptList = await api.list(videoId);

      expect(transcriptList.videoId).toBe(videoId);

      let hasTranscripts = false;
      for (const transcript of transcriptList) {
        hasTranscripts = true;
        expect(transcript.language).toBeDefined();
        expect(transcript.languageCode).toBeDefined();
        expect(typeof transcript.isGenerated).toBe("boolean");
        expect(typeof transcript.isTranslatable).toBe("boolean");
      }

      expect(hasTranscripts).toBe(true);
    }, 30000);

    it("should format transcript as SRT", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcript = await api.fetch(videoId);
      const formatter = new SRTFormatter();
      const srt = formatter.formatTranscript(transcript);

      expect(srt).toContain("-->");
      expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
      expect(srt).toContain("1\n"); // First subtitle number
      expect(srt.endsWith("\n")).toBe(true);
    }, 30000);

    it("should format transcript as WebVTT", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcript = await api.fetch(videoId);
      const formatter = new WebVTTFormatter();
      const webvtt = formatter.formatTranscript(transcript);

      expect(webvtt).toMatch(/^WEBVTT\n/);
      expect(webvtt).toContain("-->");
      expect(webvtt).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    }, 30000);
  });

  describe.skip("Language handling", () => {
    it("should fetch transcript in preferred language", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcript = await api.fetch(videoId, {
        languages: ["en"],
      });

      expect(transcript.languageCode).toBe("en");
    }, 30000);

    it("should fallback to next language if first not available", async () => {
      const videoId = "jNQXAC9IVRw";

      // Request non-existent language first, then English
      const transcript = await api.fetch(videoId, {
        languages: ["xyz", "en"],
      });

      expect(transcript.languageCode).toBe("en");
    }, 30000);

    it("should throw NoTranscriptFound for unavailable language", async () => {
      const videoId = "jNQXAC9IVRw";

      await expect(
        api.fetch(videoId, {
          languages: ["xyz", "abc"],
        }),
      ).rejects.toThrow(NoTranscriptFound);
    }, 30000);
  });

  describe.skip("Translation", () => {
    it("should translate transcript to another language", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcriptList = await api.list(videoId);
      const transcript = transcriptList.findTranscript(["en"]);

      if (transcript.isTranslatable) {
        const translated = transcript.translate("de");
        const fetched = await translated.fetch();

        expect(fetched.languageCode).toBe("de");
        expect(fetched.snippets.length).toBeGreaterThan(0);
        expect(fetched.isGenerated).toBe(true); // Translations are always generated
      } else {
        console.log(
          "Transcript is not translatable, skipping translation test",
        );
      }
    }, 30000);
  });

  describe("Proxy usage", () => {
    it("should work with proxy configuration", async () => {
      // Only test if proxy environment variables are set
      const proxyUrl = process.env.TEST_PROXY_URL;

      if (proxyUrl) {
        const proxyApi = new YouTubeTranscriptApi({
          proxyConfig: new GenericProxyConfig({
            httpUrl: proxyUrl,
            httpsUrl: proxyUrl,
          }),
        });

        const videoId = "jNQXAC9IVRw";
        const transcript = await proxyApi.fetch(videoId);

        expect(transcript.videoId).toBe(videoId);
        expect(transcript.snippets.length).toBeGreaterThan(0);
      } else {
        console.log("Skipping proxy test - TEST_PROXY_URL not set");
      }
    }, 30000);
  });

  describe.skip("Error scenarios", () => {
    it("should handle invalid video ID format", async () => {
      const videoId = "https://www.youtube.com/watch?v=invalid";

      await expect(api.fetch(videoId)).rejects.toThrow(InvalidVideoId);
    }, 30000);

    it("should handle non-existent video", async () => {
      const videoId = "ThisVideoDoesNotExist123";

      await expect(api.fetch(videoId)).rejects.toThrow();
    }, 30000);
  });

  describe.skip("Performance", () => {
    it("should fetch transcript within reasonable time", async () => {
      const videoId = "jNQXAC9IVRw";
      const startTime = Date.now();

      await api.fetch(videoId);

      const duration = Date.now() - startTime;

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    }, 35000);

    it("should handle multiple concurrent requests", async () => {
      const videoIds = ["jNQXAC9IVRw", "jNQXAC9IVRw", "jNQXAC9IVRw"];

      const promises = videoIds.map((id) => api.fetch(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((transcript) => {
        expect(transcript.snippets.length).toBeGreaterThan(0);
      });
    }, 60000);
  });

  describe.skip("Transcript content validation", () => {
    it("should return proper transcript structure", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcript = await api.fetch(videoId);

      // Check overall structure
      expect(transcript.videoId).toBe(videoId);
      expect(Array.isArray(transcript.snippets)).toBe(true);
      expect(transcript.snippets.length).toBeGreaterThan(0);

      // Check each snippet has required properties
      transcript.snippets.forEach((snippet) => {
        expect(snippet).toHaveProperty("text");
        expect(snippet).toHaveProperty("start");
        expect(snippet).toHaveProperty("duration");
        expect(typeof snippet.text).toBe("string");
        expect(typeof snippet.start).toBe("number");
        expect(typeof snippet.duration).toBe("number");
        expect(snippet.start).toBeGreaterThanOrEqual(0);
        expect(snippet.duration).toBeGreaterThanOrEqual(0);
      });

      // Verify snippets are in chronological order
      for (let i = 1; i < transcript.snippets.length; i++) {
        expect(transcript.snippets[i].start).toBeGreaterThanOrEqual(
          transcript.snippets[i - 1].start,
        );
      }
    }, 30000);

    it("should support iteration", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcript = await api.fetch(videoId);

      let count = 0;
      for (const snippet of transcript) {
        count++;
        expect(snippet.text).toBeDefined();
      }

      expect(count).toBe(transcript.length);
      expect(count).toBeGreaterThan(0);
    }, 30000);

    it("should convert to raw data correctly", async () => {
      const videoId = "jNQXAC9IVRw";

      const transcript = await api.fetch(videoId);
      const rawData = transcript.toRawData();

      expect(Array.isArray(rawData)).toBe(true);
      expect(rawData.length).toBe(transcript.length);

      rawData.forEach((item, index) => {
        expect(item.text).toBe(transcript.get(index).text);
        expect(item.start).toBe(transcript.get(index).start);
        expect(item.duration).toBe(transcript.get(index).duration);
      });
    }, 30000);
  });
});

describe("Unit Tests (mocked)", () => {
  it("should create API instance", () => {
    const api = new YouTubeTranscriptApi();
    expect(api).toBeInstanceOf(YouTubeTranscriptApi);
  });

  it("should accept proxy config", () => {
    const proxyConfig = new GenericProxyConfig({
      httpUrl: "http://proxy.example.com:8080",
    });

    const api = new YouTubeTranscriptApi({ proxyConfig });
    expect(api).toBeInstanceOf(YouTubeTranscriptApi);
  });
});

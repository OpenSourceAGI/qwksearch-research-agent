/**
 * @file no-youtube.ts
 * @description Stand-in for `extract-youtube`, which this site does not
 * bundle. extract-webpage imports `YouTubeTranscriptApi` statically, so
 * `aliases.ts` points the package here; a YouTube URL then comes back from
 * `extractContent` as an error instead of a transcript.
 */
export class YouTubeTranscriptApi {
  async fetch(_videoId: string, _options?: { languages?: string[] }): Promise<{ snippets: { text: string }[] }> {
    throw new Error('YouTube URLs are not supported here.');
  }
}

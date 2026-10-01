/**
 * @file code-example.tsx
 * @description Tabbed code samples for the landing page. Plain (unhighlighted)
 * code blocks: highlighting here would mean running Shiki in the Worker at
 * request time, which is not worth it for five snippets.
 */
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

const examples: { label: string; code: string }[] = [
  {
    label: 'Fetch',
    code: `import { YouTubeTranscriptApi } from 'extract-youtube';

const api = new YouTubeTranscriptApi();
const transcript = await api.fetch('dQw4w9WgXcQ', { languages: ['de', 'en'] });

for (const snippet of transcript) {
  console.log(\`\${snippet.start}s: \${snippet.text}\`);
}`,
  },
  {
    label: 'Worker',
    code: `// A transcript endpoint on Cloudflare Workers — no browser, no filesystem.
import { YouTubeTranscriptApi, extractVideoId } from 'extract-youtube';

const api = new YouTubeTranscriptApi();

export default {
  async fetch(request: Request) {
    const raw = new URL(request.url).searchParams.get('videoId') ?? '';
    const videoId = extractVideoId(raw);
    if (!videoId) return Response.json({ error: 'Missing videoId' }, { status: 400 });

    const transcript = await api.fetchTranscript(videoId);
    return Response.json({ videoId, snippets: transcript.toRawData() });
  },
};`,
  },
  {
    label: 'CLI',
    code: `npx extract-youtube jNQXAC9IVRw            # JSON (default)
npx extract-youtube jNQXAC9IVRw -f srt     # SRT subtitles
npx extract-youtube jNQXAC9IVRw -l en,de   # language preference
npx extract-youtube jNQXAC9IVRw --proxy http://user:pass@proxy.example.com:8080`,
  },
  {
    label: 'Formatters',
    code: `import { SRTFormatter, WebVTTFormatter, ArticleFormatter } from 'extract-youtube';

const transcript = await api.fetch('jNQXAC9IVRw');

const srt = new SRTFormatter().formatTranscript(transcript);
const vtt = new WebVTTFormatter().formatTranscript(transcript);
const article = new ArticleFormatter().formatTranscript(transcript); // text + timestamp map`,
  },
  {
    label: 'React',
    code: `import { FloatingYouTubePlayer, youtubePlayer } from 'extract-youtube/react';

// Mount once near the root…
<FloatingYouTubePlayer transcriptUrl="/api/transcript" />

// …then play from anywhere: a grid, a search result, a shortcut.
<button onClick={() => youtubePlayer.play({ videoId: 'jNQXAC9IVRw', title: 'Me at the zoo' })}>
  Play
</button>`,
  },
];

export function CodeExample() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            A few lines, <span className="text-primary">anywhere</span>
          </h2>
          <p className="text-lg text-muted-foreground">The same API in a script, a Worker, a terminal or a React app.</p>
        </div>

        <Tabs items={examples.map((e) => e.label)}>
          {examples.map((example) => (
            <Tab key={example.label} value={example.label}>
              <CodeBlock>
                <Pre>
                  <code>{example.code}</code>
                </Pre>
              </CodeBlock>
            </Tab>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

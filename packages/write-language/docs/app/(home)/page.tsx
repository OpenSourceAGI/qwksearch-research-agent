import Link from 'next/link';

const features = [
  ['10+ providers', 'OpenAI, Anthropic, Google, xAI, Groq, Bedrock, Cloudflare, NVIDIA and more.'],
  ['Model registry', 'Context lengths, defaults and capabilities for every bundled model.'],
  ['Agent prompts', 'Ready-made templates for answers, summaries, citations and search.'],
  ['HTML output', 'Markdown replies rendered with Prism.js syntax highlighting.'],
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="flex max-w-2xl flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">write-language</h1>
        <p className="text-lg text-fd-muted-foreground">
          Multi-provider language generation for TypeScript, built on the Vercel AI SDK. One call
          picks the model, fills a tuned prompt, and returns ready-to-render HTML.
        </p>
        <pre className="rounded-lg border bg-fd-card px-4 py-2 text-sm">
          <code>npm install write-language</code>
        </pre>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-full bg-fd-primary px-5 py-2 font-medium text-fd-primary-foreground"
          >
            Read the docs
          </Link>
          <a
            href="https://www.npmjs.com/package/write-language"
            className="rounded-full border px-5 py-2 font-medium"
          >
            View on npm
          </a>
        </div>
      </div>
      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2">
        {features.map(([title, body]) => (
          <div key={title} className="rounded-xl border bg-fd-card p-5 text-left">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-fd-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

/**
 * @fileoverview Configuration error component shown when no AI providers are configured. Provides helpful instructions for setting up environment variables.
 */
'use client';

export default function ConfigError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6 bg-light-secondary dark:bg-dark-secondary rounded-lg p-8 border border-black/10 dark:border-white/10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-black dark:text-white">
            ⚠️ Configuration Required
          </h1>
          <p className="text-black/70 dark:text-white/70">
            No AI model providers are configured. Add at least one API key to continue.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-black dark:text-white">Quick Setup:</h2>

          <div className="space-y-3 text-sm">
            <div className="bg-black/5 dark:bg-white/5 rounded p-4">
              <p className="font-medium text-black dark:text-white mb-2">1. Create environment file:</p>
              <code className="block bg-black/10 dark:bg-white/10 rounded p-2 text-xs overflow-x-auto">
                apps/qwksearch-web/.env.local
              </code>
            </div>

            <div className="bg-black/5 dark:bg-white/5 rounded p-4">
              <p className="font-medium text-black dark:text-white mb-2">2. Add required variables:</p>
              <pre className="block bg-black/10 dark:bg-white/10 rounded p-3 text-xs overflow-x-auto text-black/80 dark:text-white/80">
{`# Database
DATABASE_URL=file:./data/qwksearch.db

# Auth (generate: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Add ONE of these providers:

# Groq (FREE - Recommended)
GROQ_API_KEY=gsk_your_key_here

# Or OpenAI
OPENAI_API_KEY=sk-your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Or Anthropic
ANTHROPIC_API_KEY=sk-ant-your_key_here`}
              </pre>
            </div>

            <div className="bg-black/5 dark:bg-white/5 rounded p-4">
              <p className="font-medium text-black dark:text-white mb-2">3. Restart the server</p>
              <code className="block bg-black/10 dark:bg-white/10 rounded p-2 text-xs">
                Ctrl+C, then: npm run dev
              </code>
            </div>
          </div>

          <div className="pt-4 border-t border-black/10 dark:border-white/10">
            <h3 className="font-medium text-black dark:text-white mb-2">Get API Keys:</h3>
            <ul className="space-y-2 text-sm text-black/70 dark:text-white/70">
              <li>
                <strong>Groq</strong> (FREE): <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">console.groq.com/keys</a>
              </li>
              <li>
                <strong>OpenAI</strong>: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">platform.openai.com/api-keys</a>
              </li>
              <li>
                <strong>Anthropic</strong>: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">console.anthropic.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-xs text-black/50 dark:text-white/50 pt-4 border-t border-black/10 dark:border-white/10">
          See <code>SETUP_INSTRUCTIONS.md</code> in the project root for full details.
        </div>
      </div>
    </div>
  );
}

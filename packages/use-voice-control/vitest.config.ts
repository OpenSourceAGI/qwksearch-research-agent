import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // The utilities under test are pure text/buffer helpers; the browser-only
    // parts of the package (Web Audio, VAD, transformers.js) are not imported.
    environment: 'node',
    include: ['test/**/*.test.js', 'test/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // phonemize.js is deliberately absent: it imports espeak-ng from a
      // jsDelivr URL at module scope, so it cannot be loaded outside a browser.
      include: [
        'speech/utils/audio-utils.js',
        'speech/utils/semantic-split.js',
        'speech/utils/sentence-detector.js',
      ],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.js', '**/*.test.ts'],
    },
  },
});

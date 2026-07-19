import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.test.ts',
                '**/__tests__/**'
            ]
        },
        testTimeout: 30000, // 30 seconds for network requests
        hookTimeout: 30000
    }
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['*.ts', 'types/**/*.ts'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/__tests__/**',
                '**/test/**'
            ]
        }
    }
});

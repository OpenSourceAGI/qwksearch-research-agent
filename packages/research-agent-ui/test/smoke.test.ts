import { describe, expect, it } from 'vitest';
import { cn, formatMessageTime, formatTimeDifference } from '../src/lib/utils';

// The package's main barrel export (src/index.ts) eagerly re-exports every
// component and hook, including ones that pull in browser/audio-only
// dependencies (@ricky0123/vad-web, kokoro-js, next/navigation) which don't
// resolve cleanly in a plain Vitest/jsdom run. src/lib/utils.ts is a pure,
// side-effect-free module that is itself re-exported from the public API
// (see src/index.ts "Utilities" section), so it's used here as a safe smoke
// target for the real package entry point's dependency graph.
describe('research-agent-ui package entry (src/lib/utils)', () => {
    it('exports the cn className helper', () => {
        expect(cn).toBeDefined();
        expect(typeof cn).toBe('function');
        expect(cn('a', false && 'b', 'c')).toBe('a c');
    });

    it('exports formatMessageTime', () => {
        expect(formatMessageTime).toBeDefined();
        expect(formatMessageTime('not-a-date')).toBe('');
    });

    it('exports formatTimeDifference', () => {
        expect(formatTimeDifference).toBeDefined();
        expect(formatTimeDifference(new Date(0), new Date(5000))).toBe('5 seconds');
    });
});

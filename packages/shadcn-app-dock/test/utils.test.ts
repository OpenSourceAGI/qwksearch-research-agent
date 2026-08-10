import { describe, expect, it } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn', () => {
    it('joins plain class names', () => {
        expect(cn('a', 'b')).toBe('a b');
    });

    it('drops falsy values', () => {
        expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
    });

    it('applies conditional object syntax', () => {
        expect(cn('base', { active: true, hidden: false })).toBe('base active');
    });

    it('flattens arrays', () => {
        expect(cn(['a', ['b', 'c']])).toBe('a b c');
    });

    it('lets the last conflicting tailwind utility win', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4');
        expect(cn('text-sm text-red-500', 'text-lg')).toBe('text-red-500 text-lg');
    });

    it('keeps non-conflicting tailwind utilities', () => {
        expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
    });

    it('returns an empty string with no input', () => {
        expect(cn()).toBe('');
    });
});

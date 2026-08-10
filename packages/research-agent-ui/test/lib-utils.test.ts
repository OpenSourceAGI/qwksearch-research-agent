/**
 * @fileoverview Unit tests for the framework-agnostic helpers under src/lib:
 * class merging, time formatting, composer validation and URL auto-linking.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cn, formatMessageTime, formatTimeDifference } from '../src/lib/utils';
import { formatRelativeTime } from '../src/lib/relative-time';
import { canSubmitMessage } from '../src/lib/composer';
import { autoLinkUrls } from '../src/lib/url-autolink';

describe('cn', () => {
    it('joins class names and drops falsy values', () => {
        expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
    });

    it('lets the last conflicting tailwind utility win', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('applies conditional object syntax', () => {
        expect(cn('base', { active: true, hidden: false })).toBe('base active');
    });
});

describe('formatMessageTime', () => {
    it('formats a valid date as a clock time', () => {
        const formatted = formatMessageTime(new Date('2024-01-01T12:29:00Z'));

        expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('accepts a timestamp and an ISO string', () => {
        expect(formatMessageTime(Date.now())).not.toBe('');
        expect(formatMessageTime('2024-01-01T12:29:00Z')).not.toBe('');
    });

    it('returns an empty string for an unparseable value', () => {
        expect(formatMessageTime('not-a-date')).toBe('');
    });
});

describe('formatTimeDifference', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const plus = (seconds: number) => new Date(base.getTime() + seconds * 1000);

    it('reports seconds', () => {
        expect(formatTimeDifference(base, plus(1))).toBe('1 second');
        expect(formatTimeDifference(base, plus(30))).toBe('30 seconds');
    });

    it('reports minutes', () => {
        expect(formatTimeDifference(base, plus(60))).toBe('1 minute');
        expect(formatTimeDifference(base, plus(300))).toBe('5 minutes');
    });

    it('reports hours', () => {
        expect(formatTimeDifference(base, plus(3600))).toBe('1 hour');
        expect(formatTimeDifference(base, plus(7200))).toBe('2 hours');
    });

    it('reports days', () => {
        expect(formatTimeDifference(base, plus(86400))).toBe('1 day');
        expect(formatTimeDifference(base, plus(86400 * 3))).toBe('3 days');
    });

    it('reports years', () => {
        expect(formatTimeDifference(base, plus(31536000))).toBe('1 year');
        expect(formatTimeDifference(base, plus(31536000 * 2))).toBe('2 years');
    });

    it('is order-independent', () => {
        expect(formatTimeDifference(plus(300), base)).toBe('5 minutes');
    });

    it('accepts ISO strings', () => {
        expect(formatTimeDifference('2024-01-01T00:00:00Z', '2024-01-01T00:05:00Z')).toBe(
            '5 minutes'
        );
    });
});

describe('formatRelativeTime', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns an empty string for an unparseable value', () => {
        expect(formatRelativeTime('not-a-date')).toBe('');
    });

    it('reports "just now" under five seconds', () => {
        expect(formatRelativeTime(ago(2))).toBe('just now');
    });

    it('reports seconds, minutes and hours', () => {
        expect(formatRelativeTime(ago(30))).toBe('30 sec');
        expect(formatRelativeTime(ago(60 * 5))).toBe('5 min');
        expect(formatRelativeTime(ago(3600 * 3))).toBe('3 hr');
    });

    it('singularises and pluralises days and weeks', () => {
        expect(formatRelativeTime(ago(86400))).toBe('1 day');
        expect(formatRelativeTime(ago(86400 * 3))).toBe('3 days');
        expect(formatRelativeTime(ago(86400 * 7))).toBe('1 week');
        expect(formatRelativeTime(ago(86400 * 21))).toBe('3 weeks');
    });

    it('reports months and years', () => {
        expect(formatRelativeTime(ago(86400 * 60))).toBe('2 months');
        expect(formatRelativeTime(ago(86400 * 365))).toBe('1 year');
        expect(formatRelativeTime(ago(86400 * 365 * 3))).toBe('3 years');
    });

    it('accepts a timestamp and an ISO string', () => {
        expect(formatRelativeTime(ago(60).getTime())).toBe('1 min');
        expect(formatRelativeTime(ago(60).toISOString())).toBe('1 min');
    });
});

describe('canSubmitMessage', () => {
    it('allows a message with text', () => {
        expect(canSubmitMessage('hello', [])).toBe(true);
    });

    it('allows a file-only send', () => {
        expect(canSubmitMessage('', ['file-1'])).toBe(true);
        expect(canSubmitMessage('   ', ['file-1'])).toBe(true);
    });

    it('rejects an empty composer', () => {
        expect(canSubmitMessage('', [])).toBe(false);
        expect(canSubmitMessage('   ', undefined)).toBe(false);
    });

    it('tolerates a nullish message', () => {
        expect(canSubmitMessage(undefined as any, ['file-1'])).toBe(true);
        expect(canSubmitMessage(undefined as any, undefined)).toBe(false);
    });
});

describe('autoLinkUrls', () => {
    it('links a bare domain with a path', () => {
        expect(autoLinkUrls('Check out github.com/kubet/mk-blog')).toBe(
            'Check out [github.com/kubet/mk-blog](https://github.com/kubet/mk-blog)'
        );
    });

    it('keeps an existing protocol', () => {
        expect(autoLinkUrls('See https://example.com/ for more')).toContain(
            '[https://example.com/](https://example.com/)'
        );
    });

    it('links email addresses with a mailto target', () => {
        expect(autoLinkUrls('Mail me at a.b@example.com please')).toContain(
            '[a.b@example.com](mailto:a.b@example.com)'
        );
    });

    it('leaves text with no links untouched', () => {
        expect(autoLinkUrls('Just some prose here.')).toBe('Just some prose here.');
    });

    it('returns non-string input unchanged', () => {
        expect(autoLinkUrls('')).toBe('');
        expect(autoLinkUrls(null as any)).toBeNull();
        expect(autoLinkUrls(42 as any)).toBe(42 as any);
    });

    it('does not double-link an existing markdown link', () => {
        const markdown = '[the blog](https://example.com/blog)';

        expect(autoLinkUrls(markdown)).toBe(markdown);
    });

    it('skips URLs inside a fenced code block', () => {
        const text = 'before\n```\nsee example.com/x\n```';

        expect(autoLinkUrls(text)).toBe(text);
    });

    it('ignores a hostname whose suffix is not a known TLD', () => {
        expect(autoLinkUrls('file.notatld here')).toBe('file.notatld here');
    });

    it('links several URLs in one string', () => {
        const linked = autoLinkUrls('one example.com/a and two example.org/b');

        expect(linked).toContain('[example.com/a](https://example.com/a)');
        expect(linked).toContain('[example.org/b](https://example.org/b)');
    });
});

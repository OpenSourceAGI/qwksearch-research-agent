import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from '../src/react';
import {
    COOKIE_CONSENT_STORAGE_KEY,
    clearCookieConsent,
    readCookieConsent,
    writeCookieConsent,
} from '../src/index';

const props = {
    appName: 'QwkSearch',
    links: [
        { url: '/legal/privacy', text: 'Privacy' },
        { url: 'https://rights.institute/ethics', text: 'Ethics' },
    ],
};

beforeEach(() => {
    localStorage.clear();
});

describe('cookie consent storage', () => {
    it('reads back nothing until a decision is recorded', () => {
        expect(readCookieConsent()).toBeNull();
    });

    it('records accept-all and essential-only as their category sets', () => {
        expect(writeCookieConsent('all')).toMatchObject({ analytics: true, marketing: true, functional: true });
        expect(readCookieConsent()).toMatchObject({ analytics: true, marketing: true });

        expect(writeCookieConsent('essential')).toMatchObject({
            analytics: false,
            marketing: false,
            functional: true,
        });
        expect(readCookieConsent()).toMatchObject({ analytics: false, marketing: false, functional: true });
    });

    it('stamps the decision with the time it was made', () => {
        const before = Date.now();
        const stamped = Date.parse(writeCookieConsent('all').timestamp);

        expect(stamped).toBeGreaterThanOrEqual(before);
        expect(stamped).toBeLessThanOrEqual(Date.now());
    });

    it('keeps each storage key separate', () => {
        writeCookieConsent('all', 'other-app-consent');

        expect(readCookieConsent()).toBeNull();
        expect(readCookieConsent('other-app-consent')).toMatchObject({ analytics: true });
    });

    it('treats a malformed record as no decision rather than throwing', () => {
        localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'not json');
        expect(readCookieConsent()).toBeNull();

        localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ marketing: true }));
        expect(readCookieConsent()).toBeNull();
    });

    it('survives a browser that refuses storage', () => {
        const refuse = () => {
            throw new DOMException('denied', 'SecurityError');
        };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(refuse);

        expect(readCookieConsent()).toBeNull();
        expect(writeCookieConsent('all')).toMatchObject({ analytics: true });
        expect(() => clearCookieConsent()).not.toThrow();
    });

    it('forgets a decision so the banner asks again', () => {
        writeCookieConsent('all');
        clearCookieConsent();

        expect(readCookieConsent()).toBeNull();
    });
});

describe('CookieConsent', () => {
    it('asks, naming the app and linking the policies', () => {
        render(<CookieConsent {...props} />);

        expect(screen.getByRole('heading', { level: 3, name: 'Cookies & Privacy' })).toBeTruthy();
        expect(screen.getByText(/QwkSearch uses cookies/)).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/legal/privacy');
    });

    it('opens only off-site links in a new tab', () => {
        render(<CookieConsent {...props} />);

        expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('target')).toBeNull();
        expect(screen.getByRole('link', { name: 'Ethics' }).getAttribute('target')).toBe('_blank');
        expect(screen.getByRole('link', { name: 'Ethics' }).getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('stays away once a decision is on record', () => {
        writeCookieConsent('essential');
        render(<CookieConsent {...props} />);

        expect(screen.queryByRole('heading', { name: 'Cookies & Privacy' })).toBeNull();
    });

    it('records accept-all, reports it, and goes away', () => {
        const onDecision = vi.fn();
        render(<CookieConsent {...props} onDecision={onDecision} />);

        fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));

        expect(readCookieConsent()).toMatchObject({ analytics: true, marketing: true });
        expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({ analytics: true }));
        expect(screen.queryByRole('heading', { name: 'Cookies & Privacy' })).toBeNull();
    });

    it('records a rejection as essential cookies only', () => {
        render(<CookieConsent {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

        expect(readCookieConsent()).toMatchObject({ analytics: false, marketing: false, functional: true });
    });

    it('dismisses without recording anything, so it asks again next time', () => {
        render(<CookieConsent {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByRole('heading', { name: 'Cookies & Privacy' })).toBeNull();
        expect(readCookieConsent()).toBeNull();
    });

    it('can leave the dismiss button out', () => {
        render(<CookieConsent {...props} dismissible={false} />);

        expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    });

    it('takes its own copy, labels and storage key', () => {
        render(
            <CookieConsent
                {...props}
                title="Your choices"
                message="We store one session cookie."
                acceptLabel="Sure"
                rejectLabel="No thanks"
                storageKey="qs-consent"
            />,
        );

        expect(screen.getByRole('heading', { name: 'Your choices' })).toBeTruthy();
        expect(screen.getByText('We store one session cookie.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Sure' }));

        expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
        expect(readCookieConsent('qs-consent')).toMatchObject({ analytics: true });
    });

    it('publishes its height to the named CSS property, and takes it back down', () => {
        const { unmount } = render(<CookieConsent {...props} heightVar="--qs-bottom-right-inset" />);

        expect(document.documentElement.style.getPropertyValue('--qs-bottom-right-inset')).toMatch(/^\d+px$/);

        unmount();

        expect(document.documentElement.style.getPropertyValue('--qs-bottom-right-inset')).toBe('');
    });

    it('publishes nothing when no property is named', () => {
        render(<CookieConsent {...props} />);

        expect(document.documentElement.getAttribute('style')).toBeFalsy();
    });
});

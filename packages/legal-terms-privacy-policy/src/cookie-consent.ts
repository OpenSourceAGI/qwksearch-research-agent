/**
 * Cookie consent: the record the banner writes, and the storage helpers around
 * it.
 *
 * Consent belongs with the Terms and the Privacy Policy rather than with any
 * one app's UI — it is the same promise, made in a smaller box. This module is
 * framework-free so server code, analytics loaders and tests can read the
 * choice without pulling React in; the banner itself lives in
 * `legal-terms-privacy-policy/react`.
 */

/** The categories a visitor consents to, plus when they decided. */
export interface CookieConsentRecord {
    /** Usage measurement — page views, search counts, error rates. */
    analytics: boolean;
    /** Advertising and cross-site attribution. */
    marketing: boolean;
    /**
     * Cookies the product cannot work without — session, saved settings.
     * Always granted: rejecting them would be rejecting the login.
     */
    functional: boolean;
    /** ISO-8601 timestamp of the decision, for proving when consent was given. */
    timestamp: string;
}

/** Where the decision is stored, unless a caller names its own key. */
export const COOKIE_CONSENT_STORAGE_KEY = 'cookie-consent';

/** The two answers the banner offers, as category sets. */
export const COOKIE_CONSENT_CHOICES = {
    /** "Accept All" — every category on. */
    all: { analytics: true, marketing: true, functional: true },
    /** "Reject" — essential cookies only, which is also the default behaviour. */
    essential: { analytics: false, marketing: false, functional: true },
} as const satisfies Record<string, Omit<CookieConsentRecord, 'timestamp'>>;

/** Which of the two answers was given. */
export type CookieConsentChoice = keyof typeof COOKIE_CONSENT_CHOICES;

/**
 * `localStorage`, or `null` where there isn't one — server rendering, and
 * browsers that throw on access when site data is blocked. Every caller below
 * treats that case as "no decision recorded", so the banner shows and nothing
 * beyond essential cookies is assumed.
 */
function storage(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

/**
 * The visitor's recorded decision, or `null` if they have not made one — which
 * is what should show the banner. A malformed or half-written value reads as
 * no decision rather than throwing, so a bad record cannot wedge the page.
 *
 * ```ts
 * if (readCookieConsent()?.analytics) loadAnalytics();
 * ```
 */
export function readCookieConsent(storageKey = COOKIE_CONSENT_STORAGE_KEY): CookieConsentRecord | null {
    try {
        // Inside the try along with the parse: reading is two chances to throw
        // — the property access (Chrome with site data blocked) and the call
        // itself (Safari's private mode) — and both mean the same thing here.
        const raw = storage()?.getItem(storageKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
        if (typeof parsed?.analytics !== 'boolean') return null;
        return {
            analytics: parsed.analytics,
            marketing: parsed.marketing === true,
            functional: parsed.functional !== false,
            timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date(0).toISOString(),
        };
    } catch {
        return null;
    }
}

/**
 * Records a decision and returns what was stored, so a caller can act on the
 * same record the banner persisted. Writing is best-effort: in a browser with
 * storage blocked the choice applies to this page view and the banner returns
 * on the next one.
 */
export function writeCookieConsent(
    choice: CookieConsentChoice,
    storageKey = COOKIE_CONSENT_STORAGE_KEY,
): CookieConsentRecord {
    const record: CookieConsentRecord = {
        ...COOKIE_CONSENT_CHOICES[choice],
        timestamp: new Date().toISOString(),
    };

    try {
        storage()?.setItem(storageKey, JSON.stringify(record));
    } catch {
        /* Storage full or blocked — the decision still stands for this page view. */
    }

    return record;
}

/** Forgets the decision, so the banner asks again. For a "change my choices" link. */
export function clearCookieConsent(storageKey = COOKIE_CONSENT_STORAGE_KEY): void {
    try {
        storage()?.removeItem(storageKey);
    } catch {
        /* Nothing stored means nothing to clear. */
    }
}

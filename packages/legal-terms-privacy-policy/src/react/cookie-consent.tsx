'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    COOKIE_CONSENT_STORAGE_KEY,
    readCookieConsent,
    writeCookieConsent,
    type CookieConsentChoice,
    type CookieConsentRecord,
} from '../cookie-consent';
import { cookieConsentStyles } from './cookie-consent-styles';

/** A link in the row under the banner copy — usually the policy pages. */
export interface CookieConsentLink {
    url: string;
    text: string;
}

export interface CookieConsentProps {
    /** Product name, named in the default copy. */
    appName: string;
    /**
     * Links shown under the copy. Point at least one of them at the page
     * rendering {@link LegalTermsPrivacyPolicy} — a banner that asks for
     * consent without linking the policy is not asking for informed consent.
     */
    links?: CookieConsentLink[];
    /** Banner heading. Defaults to "Cookies & Privacy". */
    title?: string;
    /** Body copy. Defaults to a sentence naming `appName`. */
    message?: ReactNode;
    /** Label on the accept-everything button. Defaults to "Accept All". */
    acceptLabel?: string;
    /** Label on the essential-only button. Defaults to "Reject". */
    rejectLabel?: string;
    /** `localStorage` key holding the decision. Defaults to `cookie-consent`. */
    storageKey?: string;
    /**
     * Show the dismiss (×) button, which hides the banner for this page view
     * without recording a decision. Defaults to `true`.
     */
    dismissible?: boolean;
    /**
     * Publish the banner's height (plus its margin) into this CSS custom
     * property on `<html>` while it is up, and remove it once it is gone.
     * Other chrome anchored to the same corner can then read the property and
     * sit above the banner instead of underneath it.
     */
    heightVar?: string;
    /** Called with the stored record when the visitor accepts or rejects. */
    onDecision?: (record: CookieConsentRecord) => void;
    /** Extra class on the fixed wrapper, for sites that reposition it. */
    className?: string;
}

/** A no-op the effects can return, so every branch cleans up the same way. */
const noop = () => {};

/**
 * The cookie consent banner: one corner card stating what the app stores, the
 * links to read the detail, and the two answers.
 *
 * It shows only when no decision is on record, so once a visitor has answered
 * it stays gone. Rendering it costs nothing on the server — the check runs in
 * an effect, which also keeps it out of the pre-rendered HTML where a cached
 * page would otherwise show it to someone who already answered.
 *
 * ```tsx
 * <CookieConsent
 *     appName="QwkSearch"
 *     links={[{ url: '/legal/privacy', text: 'Privacy' }]}
 *     heightVar="--qs-bottom-right-inset"
 * />
 * ```
 */
export function CookieConsent({
    appName,
    links = [],
    title = 'Cookies & Privacy',
    message,
    acceptLabel = 'Accept All',
    rejectLabel = 'Reject',
    storageKey = COOKIE_CONSENT_STORAGE_KEY,
    dismissible = true,
    heightVar,
    onDecision,
    className,
}: CookieConsentProps): ReactNode {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!readCookieConsent(storageKey)) setIsVisible(true);
    }, [storageKey]);

    // Publish the card's height while it is up. Measured rather than assumed:
    // the copy wraps to a different number of lines at different widths, and
    // chrome sitting on top of the wrong number overlaps the buttons.
    useEffect(() => {
        const card = cardRef.current;
        if (!heightVar || !isVisible || !card) return noop;

        const root = document.documentElement;
        const sync = () =>
            root.style.setProperty(heightVar, `${Math.ceil(card.getBoundingClientRect().height) + 16}px`);

        sync();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
        observer?.observe(card);

        return () => {
            observer?.disconnect();
            root.style.removeProperty(heightVar);
        };
    }, [heightVar, isVisible]);

    const decide = (choice: CookieConsentChoice) => () => {
        // Recorded first, then reported: `onDecision?.(write(...))` would skip
        // the write entirely whenever no handler is passed, since an optional
        // call does not evaluate its arguments.
        const record = writeCookieConsent(choice, storageKey);
        onDecision?.(record);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={className ? `legal-cookie-consent ${className}` : 'legal-cookie-consent'}>
            {/* Inlined for the same reason as the legal page's stylesheet: a
                published package that imports CSS forces every consumer to
                configure CSS handling for node_modules. */}
            <style>{cookieConsentStyles}</style>

            <div ref={cardRef} className="legal-cookie-consent-card" role="region" aria-label={title}>
                <div className="legal-cookie-consent-body">
                    <div>
                        <h3 className="legal-cookie-consent-title">{title}</h3>
                        <p className="legal-cookie-consent-text">
                            {message ?? (
                                <>
                                    {appName} uses cookies to enhance your research experience, analyze usage
                                    patterns, and improve our service. We respect your privacy and only use
                                    essential cookies by default.
                                </>
                            )}
                        </p>
                        {links.length > 0 ? (
                            <div className="legal-cookie-consent-links">
                                {links.map((link) => {
                                    const external = !link.url.startsWith('/');
                                    return (
                                        <a
                                            key={link.url}
                                            href={link.url}
                                            target={external ? '_blank' : undefined}
                                            rel={external ? 'noopener noreferrer' : undefined}
                                        >
                                            {link.text}
                                        </a>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                    {dismissible ? (
                        <button
                            type="button"
                            onClick={() => setIsVisible(false)}
                            className="legal-cookie-consent-close"
                            aria-label="Close"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden="true"
                            >
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    ) : null}
                </div>
                <div className="legal-cookie-consent-actions">
                    <button type="button" onClick={decide('all')} className="legal-cookie-consent-accept">
                        {acceptLabel}
                    </button>
                    <button type="button" onClick={decide('essential')} className="legal-cookie-consent-reject">
                        {rejectLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CookieConsent;

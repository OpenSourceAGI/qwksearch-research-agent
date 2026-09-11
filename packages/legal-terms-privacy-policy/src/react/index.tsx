'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { LegalTermsPrivacyPolicyProps, LegalVariant } from '../index';
import { FullLegalTerms } from './full-terms';
import { LegalSummary } from './summary';
import { legalTermsStyles } from './styles';

export type { LegalTermsPrivacyPolicyProps, LegalVariant };
export { LEGAL_SUMMARY_URL } from '../index';
export { FullLegalTerms } from './full-terms';
export { LegalSummary } from './summary';
export { legalTermsStyles } from './styles';

/**
 * The shared Terms of Service and Privacy Policy page.
 *
 * Renders the full legal text by default, with a switch to a plain-language
 * summary of the same clauses. Sites pass their own name, contact address and
 * revision date; everything else is identical across them by design.
 *
 * ```tsx
 * <LegalTermsPrivacyPolicy
 *     appName="QwkSearch"
 *     contactEmail="support@qwksearch.com"
 *     lastRevisedDate="2026-01-15"
 *     homeUrl="/"
 * />
 * ```
 */
export function LegalTermsPrivacyPolicy({
    appName,
    contactEmail,
    lastRevisedDate,
    homeUrl,
    defaultVariant = 'full',
    className,
}: LegalTermsPrivacyPolicyProps): ReactNode {
    const [variant, setVariant] = useState<LegalVariant>(defaultVariant);
    const showingSummary = variant === 'summary';

    return (
        <main className={className ? `legal-terms-page ${className}` : 'legal-terms-page'}>
            {/* Inlined rather than imported as a .css file so the package drops into
                any bundler without CSS-in-node_modules configuration. */}
            <style>{legalTermsStyles}</style>

            <div className="legal-terms-header">
                {homeUrl ? (
                    <a href={homeUrl} className="legal-terms-back">
                        Back to Home
                    </a>
                ) : (
                    <span />
                )}
                <button
                    type="button"
                    className="legal-terms-switch"
                    onClick={() => setVariant(showingSummary ? 'full' : 'summary')}
                    aria-pressed={showingSummary}
                >
                    {showingSummary ? 'Read the full legal text' : 'Read the plain-language summary'}
                </button>
            </div>

            <h1>{appName} Terms of Service and Privacy Policy</h1>
            <p>
                <strong>Revised Date: {lastRevisedDate}</strong>
            </p>

            {showingSummary ? (
                <LegalSummary appName={appName} contactEmail={contactEmail} />
            ) : (
                <FullLegalTerms appName={appName} contactEmail={contactEmail} />
            )}
        </main>
    );
}

export default LegalTermsPrivacyPolicy;

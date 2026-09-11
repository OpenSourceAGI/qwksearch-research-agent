import type { Metadata } from 'next';
import { LegalTermsPrivacyPolicy } from 'legal-terms-privacy-policy/react';
import { config } from '@/lib/config/site';

export const metadata: Metadata = {
    title: `${config.appName} Terms of Service and Privacy Policy`,
    description: `Terms of Service and Privacy Policy for ${config.appName}`,
};

/**
 * The clauses live in the shared `legal-terms-privacy-policy` package, so this
 * page and the ones on Debate AI, AI Broker, Grab URL and Rights Institute
 * cannot drift apart. Only what is specific to QwkSearch is set here.
 *
 * Opens on the full legal text — the document this page has always published —
 * with a switch to the plain-language summary.
 */
export default function PrivacyPage() {
    return (
        <LegalTermsPrivacyPolicy
            appName={config.appName}
            contactEmail={config.appEmail}
            lastRevisedDate={config.lastRevisedDate}
            homeUrl="/"
            defaultVariant="full"
        />
    );
}

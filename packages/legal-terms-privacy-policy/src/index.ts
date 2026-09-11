/**
 * Shared Terms of Service and Privacy Policy document.
 *
 * The clauses are identical across QwkSearch, Debate AI, AI Broker, Grab URL
 * and Rights Institute; only the app's name, contact address and revision date
 * differ. Keeping one copy here is what stops the five pages from drifting.
 *
 * The document itself is a React component — import it from
 * `legal-terms-privacy-policy/react`. This entry point carries only the types
 * and constants, so server code that needs, say, the summary URL does not pull
 * React in with it.
 */

/** Which rendering of the document the page opens on. */
export type LegalVariant = 'full' | 'summary';

/** Plain-language rendering of these same terms, maintained by Rights Institute. */
export const LEGAL_SUMMARY_URL = 'https://rights.institute/terms-privacy';

export interface LegalTermsPrivacyPolicyProps {
    /** Product name, woven through the clauses (e.g. "QwkSearch"). */
    appName: string;
    /** Address users write to for account closure, deletion requests and questions. */
    contactEmail: string;
    /** Revision date shown under the title, formatted however the site prefers. */
    lastRevisedDate: string;
    /** Where the "Back to Home" link points. Omit to leave the link out. */
    homeUrl?: string;
    /** Rendering to open on. Defaults to the full legal text. */
    defaultVariant?: LegalVariant;
    /** Extra class on the page wrapper, for sites that style it further. */
    className?: string;
}

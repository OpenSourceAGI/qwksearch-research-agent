'use client';

import { CookieConsent as LegalCookieConsent } from 'legal-terms-privacy-policy/react';
import { researchAgentUIConfig } from '../config';

/**
 * The cookie consent banner, wired to this app's branding.
 *
 * The banner itself — its copy, the two answers, and the `cookie-consent`
 * record they write — lives in `legal-terms-privacy-policy` next to the Terms
 * and the Privacy Policy it links to, so the promise made in the corner card
 * and the promise made on the legal page are maintained as one thing. All
 * this adds is the app name and the footer links.
 *
 * It parks in the bottom-right corner, on top of anything else anchored there
 * (the homepage's scroll cue), so it publishes its height as
 * `--qs-bottom-right-inset` while it is up and that chrome sits above it
 * rather than underneath.
 */
export function CookieConsent() {
  return (
    <LegalCookieConsent
      appName={researchAgentUIConfig.appName}
      links={researchAgentUIConfig.footerLinks}
      heightVar="--qs-bottom-right-inset"
    />
  );
}

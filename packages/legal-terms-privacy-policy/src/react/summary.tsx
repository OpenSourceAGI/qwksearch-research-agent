import type { ReactNode } from 'react';
import { LEGAL_SUMMARY_URL } from '../index';

export interface LegalSummaryProps {
    appName: string;
    contactEmail: string;
}

/**
 * Plain-language summary of the same clauses, section by section, for readers
 * who want the gist before the legal text. It summarizes; it does not replace
 * the full document, and the note at the top says so.
 */
export function LegalSummary({ appName, contactEmail }: LegalSummaryProps): ReactNode {
    return (
        <>
            <p className="legal-terms-summary-note">
                A plain-language summary of the full text, written for readability. Where the two
                differ, the full text is the agreement. A longer plain-language version of these
                same terms is published at{' '}
                <a href={LEGAL_SUMMARY_URL} target="_blank" rel="noreferrer noopener">
                    rights.institute/terms-privacy
                </a>
                .
            </p>

            <h2>The agreement</h2>
            <ul>
                <li>Using {appName} — the site, the apps, the APIs — means you accept these terms.</li>
                <li>We can change the terms. Material changes to how we use or share your
                    information come with reasonable notice, such as an email or a notice on the
                    site. Continuing to use {appName} after a change means you accept it.</li>
                <li>The Services are built for users in the United States.</li>
            </ul>

            <h2>Using AI responsibly</h2>
            <ul>
                <li>AI output can be wrong while sounding confident and specific. Verify anything
                    you intend to rely on.</li>
                <li>Don&apos;t use {appName} to erode other people&apos;s privacy: no processing
                    personal data in breach of the law, no facial recognition or other biometric
                    identification, no spyware or surveillance.</li>
                <li>Don&apos;t use it where a wrong answer harms someone: tailored legal, medical or
                    financial advice without a qualified professional reviewing it and disclosing the
                    AI&apos;s involvement, high-stakes automated decisions about people, real-money
                    gambling, payday lending, political campaigning and lobbying, or anything that
                    discourages people from taking part in democracy.</li>
                <li>Don&apos;t use it to deceive: no disinformation or fake engagement, no
                    impersonating people or organizations, no academic dishonesty, and tell people
                    when they are talking to an AI unless that is already obvious.</li>
            </ul>

            <h2>Your account and what you submit</h2>
            <ul>
                <li>Keep your account details accurate and to yourself — you are responsible for
                    what happens under your account.</li>
                <li>What you submit (&quot;Prompts&quot;) and what the Services generate
                    (&quot;Outputs&quot;) are yours to be responsible for: by submitting something
                    you confirm you have the rights to it.</li>
                <li>Close your account any time by writing to {contactEmail}.</li>
                <li>Feedback you send us, we may use without owing you anything for it.</li>
            </ul>

            <h2>What we collect</h2>
            <ul>
                <li><strong>What you give us:</strong> contact details, account credentials, the
                    prompts and content you submit and the output you create, and anything else you
                    put in a message to us.</li>
                <li><strong>What we collect as you use the site:</strong> device and browser
                    details, IP address, approximate location, and how you interact with the
                    Services — gathered with cookies and similar technologies.</li>
                <li><strong>What others tell us:</strong> analytics data from providers such as
                    Google Analytics, and marketing data from data enrichment companies.</li>
            </ul>

            <h2>What we do with it</h2>
            <ul>
                <li>Run and improve the Services, support you, keep things secure, communicate with
                    you, do research and analytics, and meet our legal obligations.</li>
                <li>We may anonymize information so it can no longer be linked to you, and use it
                    for any purpose; we don&apos;t try to re-identify it.</li>
                <li>We share information with our corporate group, with the vendors who help run
                    the Services, with third parties you direct us to, with professional advisers,
                    and in a merger or similar transaction — plus where the law or law enforcement
                    requires it.</li>
                <li>We do not sell or share your personal information in the sense the California
                    Consumer Privacy Act gives those words.</li>
            </ul>

            <h2>Your choices</h2>
            <ul>
                <li>Your browser can block or delete cookies, though parts of the Services may then
                    misbehave. Google Analytics has its own opt-out at{' '}
                    <a
                        href="https://tools.google.com/dlpage/gaoptout"
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        tools.google.com/dlpage/gaoptout
                    </a>
                    . The site does not act on &quot;do not track&quot; signals.</li>
                <li>If you are logged in, your settings page has a switch that stops your searches
                    being used to improve our AI models.</li>
                <li>Delete your account and we remove your personal information from our servers
                    within 30 days — write to {contactEmail} to ask for that.</li>
                <li>California residents can ask what we collected, have it corrected, or have it
                    deleted, and we won&apos;t treat you differently for asking. We may need to
                    verify who you are first.</li>
            </ul>

            <h2>Limits</h2>
            <ul>
                <li>Under-13s may not use the Services, and we don&apos;t knowingly collect their
                    information. Tell us if we have, and we will delete it.</li>
                <li>We protect your information as best we reasonably can, but no system is
                    impenetrable — don&apos;t send secrets over insecure channels.</li>
                <li>Third-party sites we link to have their own policies; we are not responsible
                    for them.</li>
                <li>The Services come with no warranties, and our liability for indirect or
                    consequential losses is excluded as far as the law allows.</li>
                <li>We can suspend or end your access if you break these terms or if the law
                    requires it.</li>
            </ul>

            <h2>Questions</h2>
            <p>Write to {contactEmail}.</p>
        </>
    );
}

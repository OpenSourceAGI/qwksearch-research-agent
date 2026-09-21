<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/dm/legal-terms-privacy-policy.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/v/legal-terms-privacy-policy.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/dt/legal-terms-privacy-policy.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/types/legal-terms-privacy-policy" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=legal-terms-privacy-policy"><img src="https://packagephobia.com/badge?p=legal-terms-privacy-policy" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/legal-terms-privacy-policy"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# legal-terms-privacy-policy

The Terms of Service and Privacy Policy page that QwkSearch, Debate AI, AI Broker,
Grab URL and Rights Institute all publish — one copy, rendered as a React
component, so the pages cannot drift apart. Each site passes its own name,
contact address and revision date; every clause is shared. The cookie consent
banner ships alongside it, for the same reason.

## Usage

```tsx
import { LegalTermsPrivacyPolicy } from 'legal-terms-privacy-policy/react';

export default function PrivacyPage() {
    return (
        <LegalTermsPrivacyPolicy
            appName="QwkSearch"
            contactEmail="support@qwksearch.com"
            lastRevisedDate="2026-01-15"
            homeUrl="/"
            defaultVariant="full"
        />
    );
}
```

| Prop | Required | Description |
| --- | --- | --- |
| `appName` | yes | Product name, woven through the clauses. |
| `contactEmail` | yes | Address for account closure, deletion requests and questions. |
| `lastRevisedDate` | yes | Revision date shown under the title, formatted however the site prefers. |
| `homeUrl` | no | Target of the "Back to Home" link. Omit to leave the link out. |
| `defaultVariant` | no | `'full'` (default) or `'summary'` — which rendering the page opens on. |
| `className` | no | Extra class on the page wrapper. |

The page opens on the full legal text, with a switch to a plain-language summary
of the same clauses; the summary links out to the longer plain-language version
at [rights.institute/terms-privacy](https://rights.institute/terms-privacy).

The component carries its own stylesheet, inlined into a `<style>` element
rather than imported as a `.css` file, so it drops into any bundler without
CSS-in-`node_modules` configuration.

## Cookie consent banner

The consent banner makes the same promises the policy makes, in a smaller box,
so it lives here rather than in any one app's UI.

```tsx
import { CookieConsent } from 'legal-terms-privacy-policy/react';

<CookieConsent
    appName="QwkSearch"
    links={[{ url: '/legal/privacy', text: 'Privacy' }]}
    heightVar="--qs-bottom-right-inset"
/>;
```

It shows only when no decision is on record, and the check runs in an effect —
so it costs nothing on the server, and a cached page never shows it to someone
who already answered.

| Prop | Required | Description |
| --- | --- | --- |
| `appName` | yes | Product name, named in the default copy. |
| `links` | no | Links under the copy. Point one at the page above. |
| `title` / `message` | no | Replace the default heading and body copy. |
| `acceptLabel` / `rejectLabel` | no | Default to "Accept All" and "Reject". |
| `storageKey` | no | `localStorage` key holding the decision. Defaults to `cookie-consent`. |
| `dismissible` | no | Show the × that hides the banner without recording a decision. Defaults to `true`. |
| `heightVar` | no | CSS custom property on `<html>` to publish the banner's height into while it is up, so other chrome in the same corner can sit above it. |
| `onDecision` | no | Called with the stored record when the visitor answers. |
| `className` | no | Extra class on the fixed wrapper. |

The decision itself is readable without React, for gating analytics:

```ts
import { readCookieConsent, clearCookieConsent } from 'legal-terms-privacy-policy';

if (readCookieConsent()?.analytics) loadAnalytics();
clearCookieConsent(); // a "change my choices" link — the banner asks again
```

"Reject" records essential cookies only rather than nothing at all; the record
is stamped with the time the visitor decided. A malformed or half-written
record reads as no decision, so a bad value cannot wedge the page.

Like the legal page, the banner inlines its own stylesheet. Its colors come
from the host's shadcn/ui custom properties (`--secondary`, `--border`,
`--foreground`, `--muted`) where those are defined, so it picks up the site's
palette and light/dark switch; sites without them get a plain light card that
darkens with `prefers-color-scheme`.

## Entry points

- `legal-terms-privacy-policy` — types, `LEGAL_SUMMARY_URL` and the cookie
  consent storage helpers, no React import.
- `legal-terms-privacy-policy/react` — `LegalTermsPrivacyPolicy`, the
  `FullLegalTerms` / `LegalSummary` halves should a site want to lay them out
  itself, and `CookieConsent`.

The package ships TypeScript sources, like the other workspace packages here, so
consumers transpile it. In Next.js that means listing it in
`transpilePackages`:

```js
// next.config.mjs
transpilePackages: ["legal-terms-privacy-policy", /* ... */],
```

## Changing the text

Edits here change every site's legal page at once, which is the point — and the
reason to be deliberate. Bump `lastRevisedDate` on the consuming sites when the
substance changes, not only the wording.

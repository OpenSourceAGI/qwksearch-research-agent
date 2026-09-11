# legal-terms-privacy-policy

The Terms of Service and Privacy Policy page that QwkSearch, Debate AI, AI Broker,
Grab URL and Rights Institute all publish — one copy, rendered as a React
component, so the pages cannot drift apart. Each site passes its own name,
contact address and revision date; every clause is shared.

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

## Entry points

- `legal-terms-privacy-policy` — types and `LEGAL_SUMMARY_URL`, no React import.
- `legal-terms-privacy-policy/react` — `LegalTermsPrivacyPolicy` and the
  `FullLegalTerms` / `LegalSummary` halves, should a site want to lay them out
  itself.

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

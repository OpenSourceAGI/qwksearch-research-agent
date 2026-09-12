<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/legal-terms-privacy-policy"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/dm/legal-terms-privacy-policy.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/v/legal-terms-privacy-policy.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/dt/legal-terms-privacy-policy.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/legal-terms-privacy-policy"><img src="https://img.shields.io/npm/types/legal-terms-privacy-policy" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=legal-terms-privacy-policy"><img src="https://packagephobia.com/badge?p=legal-terms-privacy-policy" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

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

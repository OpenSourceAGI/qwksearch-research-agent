---
name: ask-legal-terms-privacy-policy
description: Guide to legal-terms-privacy-policy (packages/legal-terms-privacy-policy), the shared Terms of Service and Privacy Policy rendered by QwkSearch, Debate AI, AI Broker, Grab URL and Rights Institute — the LegalTermsPrivacyPolicy page and its full/summary switch, the React-free root entry, the inlined stylesheet, and the raw-TypeScript exports that need transpiling. Use when editing a clause, adding the page to another site, restyling it, or when importing the package fails with a syntax error or an unresolved module.
---

# Working With legal-terms-privacy-policy

`packages/legal-terms-privacy-policy`, published as **legal-terms-privacy-policy**.
One copy of the terms for every site that publishes them. Five sites each carried
their own 200-line copy of the same JSX, so they could drift apart silently; here
there is one copy, and only the product name, contact address and revision date
differ between sites.

## Setup

```tsx
// The page. Client component -- it owns the full/summary switch.
import { LegalTermsPrivacyPolicy } from 'legal-terms-privacy-policy/react';

<LegalTermsPrivacyPolicy
  appName="QwkSearch"
  contactEmail="support@qwksearch.com"
  lastRevisedDate="2026-01-15"
  homeUrl="/"
/>
```

`apps/qwksearch-web/app/legal/privacy/page.tsx` is the reference consumer: a
server component whose whole body is this call, with the three values read from
`config` in `lib/config/site` and `defaultVariant` spelled out rather than left
to the default.

**The package exports raw `.ts`/`.tsx`** — `exports` points straight at `src/`,
there is no build step and no `dist/`. Every consumer has to transpile it:
`next.config.mjs` lists it in `transpilePackages`, and a new consumer on Next
needs the same entry. This is also why editing a clause shows up immediately;
the "rebuild the package first" rule in
[`monorepo.md`](../../.claude/architecture/monorepo.md) does not apply here.

## The two entry points

| Import | Gives you | React? |
| --- | --- | --- |
| `legal-terms-privacy-policy` | `LegalTermsPrivacyPolicyProps`, `LegalVariant`, `LEGAL_SUMMARY_URL` | No — safe for server code that just wants the URL |
| `legal-terms-privacy-policy/react` | `LegalTermsPrivacyPolicy` (also the default export), plus `FullLegalTerms`, `LegalSummary` and `legalTermsStyles` | Yes, `'use client'` |

`FullLegalTerms` and `LegalSummary` take `{ appName, contactEmail }` and render
one document each, without the page chrome — reach for them only if a site needs
its own header or its own switch.

## The props that matter

| Prop | Default | Meaning |
| --- | --- | --- |
| `appName` | — | Product name, woven through the clauses |
| `contactEmail` | — | Address for account closure, deletion requests and questions |
| `lastRevisedDate` | — | Rendered as the `Revised Date:` line, formatted however the site prefers |
| `homeUrl` | — | Target of the back link. **Omit it and the link disappears** (an empty `<span>` holds the layout) |
| `defaultVariant` | `'full'` | Which rendering the page opens on |
| `className` | — | Added alongside `legal-terms-page` on the `<main>` |

## What the document contains

The full text is 18 numbered clauses — introduction and changes, the AI ethical
use policy (3.1–3.4), accounts and use, prompts and outputs, the privacy policy
(7.1–7.3), cookies, disclosure, social features, third-party links, children's
privacy, security and retention, California/CCPA rights (14.1–14.3), feedback,
warranties, termination and contact. The summary restates the same ground under
eight plain-language headings and opens by saying that where the two differ, the
full text is the agreement. A longer plain-language version lives at
`LEGAL_SUMMARY_URL` (rights.institute/terms-privacy).

**Edit a clause in `src/react/full-terms.tsx` and `src/react/summary.tsx`, never
in a consumer's page** — a site that hand-edits its own copy is the drift this
package exists to prevent. Keep the two sides saying the same thing, and treat a
change to either as a change to a published legal document: say so in the PR.

## Styling

The stylesheet is a string in `src/react/styles.ts`, rendered into a `<style>`
element by the component, because a published package that `import`s a `.css`
file forces every consumer to configure CSS handling for `node_modules`, and
Next, Vite and the extension builds each do that differently. Class names are
prefixed `legal-terms-` so a host page's styles cannot collide.

Its first line is an `@import` of Lato from Google Fonts. CSS requires `@import`
to come before any other rule, so **add new rules below it**, never above.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Unexpected token` / syntax error importing the package | Raw TSX reached a bundler that does not transpile `node_modules` | Add the package to `transpilePackages` (Next) or the equivalent allowlist |
| `useState only works in a Client Component` | The page re-exported the component from a server module | Import it in a client boundary, or let the page render it directly — it already carries `'use client'` |
| Clause edit does not show | Editing the consumer's page rather than `src/react/full-terms.tsx` | Edit the package; the app has no copy to edit |
| Back link missing | `homeUrl` not passed | Pass it; the link is omitted by design when it is absent |
| Lato not loading | A rule was added above the `@import` in `styles.ts` | Move it below |

## Tests

`cd packages/legal-terms-privacy-policy && bun run test` — Testing Library over
jsdom, covering the default variant, the switch in both directions, the app name
and contact address reaching the clauses, and the omitted back link.
`bun run typecheck` is the package's own `tsc --noEmit`; there is no build to run.

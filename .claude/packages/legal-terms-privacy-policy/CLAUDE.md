# CLAUDE.md — `legal-terms-privacy-policy`

**Read [`skills/ask-legal-terms-privacy-policy`](../../../skills/ask-legal-terms-privacy-policy/SKILL.md)
first.**

The shared Terms of Service and Privacy Policy page, as a React component with a
scannable summary alongside the full text. Published.

## Legal text is not refactorable prose

- **Do not reword, condense or "improve" the legal content** to fit a layout.
  Structure, tokens and presentation are yours; the wording is not.
- The summary and the full text must stay in sync — a section removed from one
  has to be accounted for in the other.
- An unsubstituted token (company name, jurisdiction, contact) shipping to a
  live site is the failure mode worth testing for.

**A sibling copy of this package exists in `dev-tools-starter-agent`, and the
ai-broker app renders its legal pages from that one.** Changing a token name or
an export here can diverge the two — check before renaming.

```bash
cd packages/legal-terms-privacy-policy && bun run test
```

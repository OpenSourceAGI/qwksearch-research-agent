# Security Policy

## Supported Versions

Security fixes are generally provided for the latest version on the default
branch.

| Version | Supported |
| ------- | --------- |
| Latest `master` / current release | Yes |
| Older releases | No |

If you are using an older release, please upgrade to the latest available
version before reporting an issue unless the issue prevents upgrading.

## Reporting a Vulnerability

Please do **not** report security vulnerabilities through public GitHub issues,
GitHub Discussions, pull requests, or public chat channels.

Report suspected vulnerabilities privately using one of the following methods:

1. GitHub Private Vulnerability Reporting:
   https://github.com/OpenSourceAGI/qwksearch-research-agent/security/advisories/new

2. Email:
   **grokthiscontact@gmail.com**

Please include as much of the following information as possible:

- A clear description of the vulnerability and its potential impact
- Affected versions, commit SHA, branch, or deployment environment
- Reproduction steps or a minimal proof of concept
- Expected behavior and observed behavior
- Relevant logs, stack traces, or screenshots, with secrets removed
- Suggested remediation, if you have one
- Your preferred contact method and whether you would like credit

## Response Process

After receiving a report, maintainers will aim to:

- Acknowledge receipt within 7 days
- Confirm whether the issue is reproducible and in scope
- Keep you informed about material progress
- Develop and test a fix or mitigation when appropriate
- Coordinate disclosure timing with the reporter
- Publish a security advisory when a fix is available, where appropriate

Response timelines are targets, not guarantees. Complexity, maintainer
availability, and downstream dependency coordination can affect resolution time.

## Scope

Examples of in-scope reports include:

- Exposed API keys, tokens, credentials, or other secrets
- Remote code execution or arbitrary command execution
- Prompt injection paths that cause unauthorized actions or data disclosure
- Server-side request forgery (SSRF), especially access to private networks or
  cloud metadata endpoints
- Authentication, authorization, session, or access-control bypasses
- Cross-site scripting (XSS), SQL injection, command injection, or path traversal
- Vulnerable dependency configurations with a demonstrated project impact
- Unauthorized access to research data, user data, stored conversations, or provider credentials
- Unsafe handling of user-supplied URLs, files, tool output, or web content
- Denial-of-service issues with a realistic and disproportionate impact

## Out of Scope

Unless there is a demonstrated security impact, the following are generally out
of scope:

- Vulnerabilities only affecting unsupported or modified deployments
- Social engineering of maintainers or project users
- Missing best-practice headers without an exploitable impact
- Rate-limit concerns without a practical denial-of-service impact
- Vulnerabilities in third-party services that are not caused by this project
- Reports based solely on theoretical prompt-injection concerns without a
  reproducible unauthorized action, data exposure, or privilege-boundary bypass
- Automated scanner reports without a clear proof of impact
- Denial-of-service reports requiring unrealistic traffic volumes

## Handling Secrets

Never include real secrets in a report, issue, pull request, log, or proof of
concept. This includes:

- API keys and bearer tokens
- Search-provider, LLM-provider, and database credentials
- OAuth client secrets and refresh tokens
- Private URLs, deployment credentials, or cloud access keys
- Personally identifiable information

If you accidentally expose a secret in a public GitHub issue, commit, pull
request, or discussion:

1. Revoke or rotate the secret immediately.
2. Remove it from the active deployment environment.
3. Contact the affected provider if required.
4. Report the exposure privately using the method above.
5. Rewrite Git history if necessary, but do not assume history rewriting alone
   invalidates a leaked credential.

## Disclosure

Please give maintainers a reasonable opportunity to investigate and address the
issue before public disclosure. We will work with you to agree on a coordinated
disclosure timeline.

We appreciate responsible disclosure and will credit reporters in a security
advisory or release notes when they request it and doing so is appropriate.

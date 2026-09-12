# CLAUDE.md — `apps/test-reports`

Private. **Infrastructure only** — a Cloudflare Worker that statically hosts the
Vitest HTML report, deployed by `deploy-test-reports.yml` on push to `master`.

There is no product code here and no behaviour to test. It exists so the test
report has a URL.

If you are here because a test is failing, the failure is in the package that
owns the test — not in this app. Changing this Worker changes where the report
is *served*, never what it says.

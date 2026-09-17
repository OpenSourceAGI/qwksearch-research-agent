/**
 * @fileoverview The API reference, served at the API root.
 *
 * `GET /api` renders the Scalar viewer against the OpenAPI spec at
 * `/api/openapi`. It lives here rather than a level down because `/api` is the
 * URL people try first and the one every README badge is shorter for; the old
 * `/api/docs` address redirects here so nothing already published breaks.
 */
import { NextResponse } from "next/server";
import { config } from "@/lib/config/site";
import { withCors, corsPreflight } from "@/lib/cors";

/** Where the spec this viewer renders is served from. */
export const OPENAPI_SPEC_URL = "/api/openapi";

async function renderDocsPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${config.appName} API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script
    id="api-reference"
    data-url="${OPENAPI_SPEC_URL}"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
  `.trim();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

export const GET = withCors(renderDocsPage, { skipApiKeyCheck: true });
export const OPTIONS = corsPreflight;

/**
 * @fileoverview API documentation page. GET renders an HTML page with the
 * Scalar API reference viewer powered by the OpenAPI spec.
 */
import { NextResponse } from "next/server";
import { config } from "@/lib/config/site";

export async function GET() {
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
    data-url="/api/openapi"
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

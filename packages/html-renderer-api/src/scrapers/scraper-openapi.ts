/**
 * @file scraper-openapi.ts
 * @description OpenAPI 3.0 specification and Swagger UI endpoints for the
 * Puppeteer rendering API.  `serveSwagger` returns the interactive Swagger UI
 * page; `serveOpenAPI` returns the raw JSON spec consumed by that UI.
 */

/**
 * Returns an HTML page that renders the Swagger UI pointed at `./openapi.json`.
 *
 * @returns HTTP response with `Content-Type: text/html`.
 */
export function serveSwagger(): Response {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Puppeteer API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: './openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ]
        });
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

/** Minimal OpenAPI 3.0 schema type used for the spec object below. */
interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact: { name: string };
  };
  servers: Array<{ url: string; description: string }>;
  security: Array<Record<string, string[]>>;
  paths: Record<string, unknown>;
  components: {
    securitySchemes: Record<string, unknown>;
  };
}

/**
 * Returns the OpenAPI 3.0.3 JSON specification for the rendering API.
 * Documents both the GET and POST `/render` endpoints including all
 * parameters, request body fields, and response schemas.
 *
 * @returns HTTP response with `Content-Type: application/json`.
 */
export function serveOpenAPI(): Response {
  const spec: OpenAPISpec = {
    openapi: "3.0.3",
    info: {
      title: "Puppeteer Rendering API",
      description:
        "A powerful web scraping and rendering API using Puppeteer with Cloudflare Workers and Durable Objects. Includes automatic Cloudflare challenge bypass.",
      version: "2.1.0",
      contact: { name: "API Support" },
    },
    servers: [{ url: "/api", description: "API Server" }],
    security: [{ bearerAuth: [] }, { passwordAuth: [] }],
    paths: {
      "/render": {
        get: {
          summary: "Render webpage (GET)",
          description:
            "Render a webpage using Puppeteer and return the HTML content. Automatically bypasses Cloudflare challenges.",
          parameters: [
            {
              name: "url",
              in: "query",
              required: true,
              schema: { type: "string", format: "uri" },
              description: "The URL to render",
            },
            {
              name: "SCRAPER_API_KEY",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "API key (if required)",
            },
            {
              name: "wait",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 0, maximum: 30000 },
              description: "Additional wait time in milliseconds",
            },
            {
              name: "blockImages",
              in: "query",
              required: false,
              schema: { type: "boolean" },
              description: "Block image loading to save bandwidth",
            },
            {
              name: "sessionId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "Session ID for browser reuse and cookie persistence",
            },
            {
              name: "timeout",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 5000, maximum: 60000 },
              description: "Page load timeout in milliseconds",
            },
            {
              name: "waitUntil",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: [
                  "load",
                  "domcontentloaded",
                  "networkidle0",
                  "networkidle2",
                ],
              },
              description: "When to consider navigation succeeded",
            },
            {
              name: "cookies",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "JSON string of cookies to set",
            },
            {
              name: "format",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["html", "json"] },
              description: "Response format",
            },
            {
              name: "proxyUrl",
              in: "query",
              required: false,
              schema: { type: "string", format: "uri" },
              description:
                "Proxy server URL (e.g., http://proxy.example.com:8080)",
            },
            {
              name: "proxyUser",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Proxy username (if proxy requires authentication)",
            },
            {
              name: "proxyPass",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Proxy password (if proxy requires authentication)",
            },
            {
              name: "bypassCaptcha",
              in: "query",
              required: false,
              schema: { type: "boolean", default: true },
              description:
                "Enable Cloudflare challenge bypass (enabled by default)",
            },
            {
              name: "challengeMatch",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "Custom string to detect challenge pages (default: 'challenge-platform')",
            },
            {
              name: "maxRetries",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 20, default: 10 },
              description: "Maximum retries for challenge bypass",
            },
            {
              name: "challengeTimeout",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1000,
                maximum: 30000,
                default: 5000,
              },
              description: "Timeout for each challenge retry in milliseconds",
            },
            {
              name: "twoCaptchaKey",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "2captcha API key for solving reCAPTCHA/Turnstile challenges (optional, for sites with harder protection)",
            },
          ],
          responses: {
            "200": {
              description: "Successfully rendered webpage",
              content: {
                "text/html": { schema: { type: "string" } },
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      html: { type: "string" },
                      url: { type: "string" },
                      title: { type: "string" },
                      cookies: { type: "array" },
                      performance: { type: "object" },
                      challengeBypassed: { type: "boolean" },
                      retryCount: { type: "integer" },
                    },
                  },
                },
              },
            },
            "400": { description: "Bad request - missing URL or invalid parameters" },
            "401": { description: "Unauthorized - invalid or missing password" },
            "500": { description: "Internal server error" },
          },
        },
        post: {
          summary: "Render webpage (POST)",
          description:
            "Render a webpage using Puppeteer with advanced options via POST body. Automatically bypasses Cloudflare challenges.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: { type: "string", format: "uri" },
                    SCRAPER_API_KEY: { type: "string" },
                    wait: { type: "integer", minimum: 0, maximum: 30000 },
                    blockImages: { type: "boolean" },
                    sessionId: { type: "string" },
                    timeout: {
                      type: "integer",
                      minimum: 5000,
                      maximum: 60000,
                    },
                    waitUntil: {
                      type: "string",
                      enum: [
                        "load",
                        "domcontentloaded",
                        "networkidle0",
                        "networkidle2",
                      ],
                    },
                    cookies: { type: "string" },
                    headers: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                    format: { type: "string", enum: ["html", "json"] },
                    proxyUrl: { type: "string", format: "uri" },
                    proxyUser: { type: "string" },
                    proxyPass: { type: "string" },
                    bypassCaptcha: { type: "boolean", default: true },
                    challengeMatch: { type: "string" },
                    maxRetries: {
                      type: "integer",
                      minimum: 1,
                      maximum: 20,
                      default: 10,
                    },
                    challengeTimeout: {
                      type: "integer",
                      minimum: 1000,
                      maximum: 30000,
                      default: 5000,
                    },
                    twoCaptchaKey: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successfully rendered webpage",
              content: {
                "text/html": { schema: { type: "string" } },
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      html: { type: "string" },
                      url: { type: "string" },
                      title: { type: "string" },
                      cookies: { type: "array" },
                      performance: { type: "object" },
                      challengeBypassed: { type: "boolean" },
                      retryCount: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Use your API key as the bearer token",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "query",
          name: "SCRAPER_API_KEY",
          description: "API key as query parameter",
        },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

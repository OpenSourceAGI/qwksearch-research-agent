/**
 * @file unsupported.js
 * @description Stand-in for extract-pdf's optional Node-only engines
 * (LiteParse, Granite Docling, @napi-rs/canvas). wrangler.jsonc aliases them
 * here so they are not bundled; importing one rejects with a clear message.
 */
throw new Error(
  "This engine is not available in the Cloudflare Workers demo. " +
    "Use the default method (ts-block-algorithm) with processor \"frontend\".",
);

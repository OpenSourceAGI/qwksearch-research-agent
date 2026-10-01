/**
 * @file unsupported.ts
 * @description Stand-in for extract-pdf's optional Node-only engines
 * (LiteParse, Granite Docling via transformers.js, @napi-rs/canvas).
 * `vite.config.ts` aliases them here for the Worker build so they are not
 * bundled; importing one rejects with a clear message.
 */
throw new Error(
  'This engine is not available on Cloudflare Workers. ' +
    'Use the default method (ts-block-algorithm) with processor "frontend".',
);

export {};

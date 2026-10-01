/**
 * @file server.js
 * @description Entry point of the Granite Docling Hugging Face Space: binds
 * the API to 0.0.0.0:$PORT (7860, the Space's `app_port`).
 *
 * The model is NOT loaded here. `/health` answers immediately; the model
 * downloads and loads on the first conversion or on `POST /api/v1/warmup`.
 */
import { serve } from "@hono/node-server";

import * as model from "./model.js";
import { createApp } from "./app.js";
import { renderDoctagsHtml } from "./doctags-to-html.js";

if (!process.env.DOCLING_API_TOKEN) {
    console.warn(
        process.env.NODE_ENV === "production"
            ? "DOCLING_API_TOKEN is not set: conversion endpoints answer 503 until it is added as a Space secret."
            : "DOCLING_API_TOKEN is not set: conversion endpoints are open (development only).",
    );
}

const app = createApp({ model, renderHtml: renderDoctagsHtml });
const port = Number(process.env.PORT ?? 7860);

serve({ fetch: app.fetch, hostname: "0.0.0.0", port }, () => {
    console.log(`Docling processor listening on port ${port}`);
});

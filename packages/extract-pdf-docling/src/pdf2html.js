/**
 * @file pdf2html.js
 * @description Entry point: wires middleware, route handlers, OpenAPI docs, and starts the server.
 */
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { initializeModel, isModelLoaded, generateFromImage, load_image } from "./model.js";
import { convertImageRoute, convertImageBase64Route, healthRoute } from "./routes.js";

const app = new OpenAPIHono();

app.use("*", cors());
app.use("*", logger());

/** Timestamp used to calculate uptime for the health endpoint. */
const startTime = Date.now();

// ── Health ────────────────────────────────────────────────────────────────────

app.openapi(healthRoute, (c) =>
    c.json({
        status: "healthy",
        modelLoaded: isModelLoaded(),
        uptime: Date.now() - startTime,
        version: "1.0.0",
    })
);

// ── Convert (URL) ─────────────────────────────────────────────────────────────

app.openapi(convertImageRoute, async (c) => {
    const startProcessing = Date.now();

    try {
        const { imageUrl, prompt, maxTokens, streaming } = c.req.valid("json");

        let image;
        try {
            image = await load_image(imageUrl);
        } catch {
            return c.json({ success: false, error: "Failed to load image from URL", code: "IMAGE_LOAD_ERROR" }, 400);
        }

        const { generatedText } = await generateFromImage({ image, prompt, maxTokens, streaming });

        return c.json({
            success: true,
            result: generatedText,
            metadata: { processingTime: Date.now() - startProcessing },
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return c.json({ success: false, error: error.message || "Internal processing error", code: "PROCESSING_ERROR" }, 500);
    }
});

// ── Convert (base64) ──────────────────────────────────────────────────────────

app.openapi(convertImageBase64Route, async (c) => {
    const startProcessing = Date.now();

    try {
        const { imageBase64, mimeType, prompt, maxTokens, streaming } = c.req.valid("json");

        let image;
        try {
            image = await load_image(`data:${mimeType};base64,${imageBase64}`);
        } catch {
            return c.json({ success: false, error: "Failed to decode base64 image", code: "IMAGE_DECODE_ERROR" }, 400);
        }

        const { generatedText, generated_ids } = await generateFromImage({ image, prompt, maxTokens, streaming });

        return c.json({
            success: true,
            result: generatedText,
            metadata: {
                processingTime: Date.now() - startProcessing,
                tokenCount: generated_ids?.dims?.[1],
            },
        });
    } catch (error) {
        console.error("Conversion error:", error);
        return c.json({ success: false, error: error.message || "Internal processing error", code: "PROCESSING_ERROR" }, 500);
    }
});

// ── Streaming SSE endpoint ────────────────────────────────────────────────────

/**
 * POST /api/v1/convert-stream
 * Streams generated tokens via Server-Sent Events.
 * Not registered with OpenAPI because SSE responses fall outside the JSON schema.
 */
app.post("/api/v1/convert-stream", async (c) => {
    const { imageUrl, prompt = "Convert this page to docling.", maxTokens = 4096 } = await c.req.json();

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (payload) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            try {
                const { model, processor } = await initializeModel();
                const image = await load_image(imageUrl);

                const messages = [{
                    role: "user",
                    content: [{ type: "image" }, { type: "text", text: prompt }],
                }];
                const text = processor.apply_chat_template(messages, { add_generation_prompt: true });
                const inputs = await processor(text, [image], { do_image_splitting: true });

                let fullText = "";
                const { TextStreamer } = await import("@huggingface/transformers");
                const streamer = new TextStreamer(processor.tokenizer, {
                    skip_prompt: true,
                    skip_special_tokens: false,
                    on_finalized_text: (chunk) => {
                        fullText += chunk;
                        send({ text: chunk, done: false });
                    },
                });

                await model.generate({ ...inputs, max_new_tokens: maxTokens, streamer });
                send({ text: "", done: true, fullText });
            } catch (error) {
                send({ error: error.message, done: true });
            }
            controller.close();
        },
    });

    return new Response(stream);
});

// ── Docs & error handling ─────────────────────────────────────────────────────

app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
        version: "1.0.0",
        title: "Granite Docling API",
        description: "API for converting images to docling format using the Granite Docling model",
    },
    servers: [{ url: "http://localhost:3000", description: "Development server" }],
});

app.get("/docs", swaggerUI({ url: "/openapi.json" }));
app.get("/", (c) => c.redirect("/docs"));

app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({ success: false, error: err.message || "Internal server error", code: "INTERNAL_ERROR" }, 500);
});

app.notFound((c) =>
    c.json({ success: false, error: "Endpoint not found", code: "NOT_FOUND" }, 404)
);

// ── Start ─────────────────────────────────────────────────────────────────────

// Workers runtime uses the default export; Node.js uses serve().
export default app;

if (typeof process !== "undefined" && process.env.NODE_ENV !== "worker") {
    initializeModel().catch(console.error);
    const port = process.env.PORT || 3000;
    console.log(`Server is running on port ${port}`);
    console.log(`OpenAPI documentation available at http://localhost:${port}/docs`);
    serve({ fetch: app.fetch, port });
}

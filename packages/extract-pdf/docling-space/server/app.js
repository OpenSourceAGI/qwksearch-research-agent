/**
 * @file app.js
 * @description HTTP API of the Granite Docling Space, built as a factory so
 * the routes, auth and queue can be tested with a fake model.
 *
 * The Space only does the expensive part: one already-rasterized page image
 * in, doctags (or sanitized HTML) out. PDF parsing, page triage and
 * rasterization stay with the caller (`extract-pdf` or the demo Worker).
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { z } from "zod";

const DEFAULT_PROMPT = "Convert this page to docling.";

/**
 * @param {object} deps
 * @param {{
 *   initializeModel: () => Promise<unknown>,
 *   isModelLoaded: () => boolean,
 *   generateFromImage: (opts: {image: any, prompt: string, maxTokens: number, streaming: boolean}) => Promise<{generatedText: string}>,
 *   load_image: (src: string) => Promise<any>,
 * }} deps.model - `./model.js`, or a fake in tests
 * @param {(doctags: string) => string} deps.renderHtml - doctags → sanitized HTML
 * @param {Record<string, string | undefined>} [deps.env] - defaults to `process.env`
 */
export function createApp({ model, renderHtml, env = process.env }) {
    const token = env.DOCLING_API_TOKEN || "";
    const production = env.NODE_ENV === "production";
    const maxTokensCap = positiveInt(env.DOCLING_MAX_TOKENS, 4096);
    const maxQueue = positiveInt(env.DOCLING_MAX_QUEUE, 8);
    const maxImageBytes = positiveInt(env.DOCLING_MAX_IMAGE_MB, 10) * 1024 * 1024;

    const requestSchema = z
        .object({
            imageUrl: z.url({ protocol: /^https?$/ }).optional(),
            imageBase64: z.string().min(1).optional(),
            mimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/i).default("image/png"),
            prompt: z.string().min(1).max(4000).default(DEFAULT_PROMPT),
            maxTokens: z.coerce.number().int().min(1).default(1500),
            // doctags keeps the `extract-pdf` client contract: it converts
            // `result` to HTML itself. Ask for "html" to get it sanitized here.
            output: z.enum(["doctags", "html"]).default("doctags"),
        })
        .refine((body) => Boolean(body.imageUrl || body.imageBase64), {
            message: "Provide imageUrl or imageBase64.",
        });

    // ── One model job at a time ──────────────────────────────────────────────
    // A CPU Space has 2 vCPUs; two generations at once only make both slower.
    const queue = [];
    let busy = false;

    function runOneAtATime(task) {
        return new Promise((resolve, reject) => {
            queue.push({ task, resolve, reject });
            void drain();
        });
    }

    async function drain() {
        if (busy || queue.length === 0) return;
        busy = true;
        const job = queue.shift();
        try {
            job.resolve(await job.task());
        } catch (error) {
            job.reject(error);
        } finally {
            busy = false;
            void drain();
        }
    }

    const pending = () => queue.length + (busy ? 1 : 0);

    // ── Auth ─────────────────────────────────────────────────────────────────

    const digest = (value) => createHash("sha256").update(value).digest();
    const expected = token ? digest(token) : null;

    /** Returns an error response, or null when the caller may proceed. */
    function authorize(c) {
        if (!expected) {
            // Open only for local development; a deployed Space fails closed.
            if (!production) return null;
            return fail(c, 503, "NOT_CONFIGURED", "DOCLING_API_TOKEN is not set on this Space.");
        }
        // X-Docling-Token first: on a private Space, Authorization carries
        // the Hugging Face token instead.
        const given =
            c.req.header("x-docling-token") ??
            c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ??
            "";
        if (timingSafeEqual(digest(given), expected)) return null;
        return fail(c, 401, "UNAUTHORIZED", "Missing or wrong X-Docling-Token.");
    }

    // ── Routes ───────────────────────────────────────────────────────────────

    const app = new Hono();
    const startTime = Date.now();

    if (env.ALLOWED_ORIGIN) {
        app.use(
            "*",
            cors({
                origin: env.ALLOWED_ORIGIN.split(",").map((origin) => origin.trim()),
                allowHeaders: ["Content-Type", "Authorization", "X-Docling-Token"],
                allowMethods: ["GET", "POST", "OPTIONS"],
            }),
        );
    }

    app.get("/", (c) =>
        c.json({
            name: "extract-pdf-docling-processor",
            endpoints: [
                "GET /health",
                "POST /api/v1/warmup",
                "POST /api/v1/convert",
                "POST /api/v1/convert-base64",
            ],
        }),
    );

    app.get("/health", (c) =>
        c.json({
            status: "healthy",
            modelLoaded: model.isModelLoaded(),
            busy,
            queueDepth: queue.length,
            uptime: Date.now() - startTime,
        }),
    );

    app.post("/api/v1/warmup", async (c) => {
        const denied = authorize(c);
        if (denied) return denied;
        try {
            await runOneAtATime(() => model.initializeModel());
        } catch (error) {
            console.error("Model warmup failed:", error);
            return fail(c, 500, "MODEL_LOAD_ERROR", messageOf(error));
        }
        return c.json({ success: true, modelLoaded: model.isModelLoaded() });
    });

    // base64 inflates by 4/3, plus room for the rest of the JSON body.
    const limitBody = bodyLimit({
        maxSize: Math.ceil((maxImageBytes * 4) / 3) + 64 * 1024,
        onError: (c) => fail(c, 413, "TOO_LARGE", "Request body is too large."),
    });

    async function convert(c) {
        const denied = authorize(c);
        if (denied) return denied;

        const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) {
            return c.json(
                { success: false, error: "Invalid request.", code: "INVALID_REQUEST", issues: parsed.error.issues },
                400,
            );
        }
        const body = parsed.data;

        if (pending() >= maxQueue) {
            c.header("Retry-After", "30");
            return fail(c, 503, "BUSY", `Queue is full (${pending()} jobs). Retry later.`);
        }

        let image;
        try {
            image = await loadImage(body);
        } catch (error) {
            return fail(c, 400, "IMAGE_LOAD_ERROR", messageOf(error));
        }

        const queuedAt = Date.now();
        try {
            let startedAt = queuedAt;
            const doctags = await runOneAtATime(async () => {
                startedAt = Date.now();
                const { generatedText } = await model.generateFromImage({
                    image,
                    prompt: body.prompt,
                    maxTokens: Math.min(body.maxTokens, maxTokensCap),
                    streaming: false,
                });
                return generatedText ?? "";
            });
            const html = body.output === "html" ? renderHtml(doctags) : undefined;
            return c.json({
                success: true,
                output: body.output,
                result: body.output === "html" ? html : doctags,
                doctags,
                html,
                metadata: {
                    processingTime: Date.now() - startedAt,
                    queueTime: startedAt - queuedAt,
                    queueDepth: queue.length,
                },
            });
        } catch (error) {
            console.error("Docling conversion failed:", error);
            return fail(c, 500, "PROCESSING_ERROR", messageOf(error));
        }
    }

    /** Decodes the request's image, from a URL or from base64. */
    async function loadImage(body) {
        if (body.imageUrl) return model.load_image(body.imageUrl);
        const base64 = body.imageBase64.replace(/^data:[^;,]+;base64,/, "").replace(/\s+/g, "");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("imageBase64 is not valid base64.");
        if ((base64.length * 3) / 4 > maxImageBytes) throw new Error("Image is too large.");
        return model.load_image(`data:${body.mimeType};base64,${base64}`);
    }

    app.post("/api/v1/convert", limitBody, convert);
    app.post("/api/v1/convert-base64", limitBody, convert);

    app.onError((error, c) => {
        console.error(error);
        return fail(c, 500, "INTERNAL_ERROR", "Internal server error");
    });
    app.notFound((c) => fail(c, 404, "NOT_FOUND", "Endpoint not found"));

    return app;
}

function fail(c, status, code, error) {
    return c.json({ success: false, error, code }, status);
}

function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}

function positiveInt(value, fallback) {
    const number = Number.parseInt(value ?? "", 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

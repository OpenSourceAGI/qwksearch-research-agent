/**
 * @file app.js
 * @description HTTP API of the Granite Docling Space, built as a factory so
 * the routes, auth and queue can be tested with a fake model.
 *
 * The Space only does the expensive part: one already-rasterized page image
 * in, doctags (or sanitized HTML) out. PDF parsing, page triage and
 * rasterization stay with the caller (`extract-pdf` or the demo Worker).
 *
 * Images are never kept. Each one is read into memory, decoded, run through
 * the model and dropped with the request: nothing is written to disk, cached
 * or logged, and responses carry `Cache-Control: no-store`.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { z } from "zod";

const DEFAULT_PROMPT = "Convert this page to docling.";
const IMAGE_FETCH_TIMEOUT_MS = 15_000;

/**
 * @param {object} deps
 * @param {{
 *   initializeModel: () => Promise<unknown>,
 *   isModelLoaded: () => boolean,
 *   generateFromImage: (opts: {image: any, prompt: string, maxTokens: number, streaming: boolean}) => Promise<{generatedText: string}>,
 *   load_image: (src: Blob) => Promise<any>,
 * }} deps.model - `./model.js`, or a fake in tests
 * @param {(doctags: string) => string} deps.renderHtml - doctags → sanitized HTML
 * @param {Record<string, string | undefined>} [deps.env] - defaults to `process.env`
 * @param {typeof fetch} [deps.fetchImage] - fetches `imageUrl`; defaults to `fetch`
 */
export function createApp({ model, renderHtml, env = process.env, fetchImage = fetch }) {
    const token = env.DOCLING_API_TOKEN || "";
    const production = env.NODE_ENV === "production";
    const limits = {
        maxImageMb: positiveInt(env.DOCLING_MAX_IMAGE_MB, 10),
        maxQueue: positiveInt(env.DOCLING_MAX_QUEUE, 8),
        maxTokens: positiveInt(env.DOCLING_MAX_TOKENS, 4096),
        defaultTokens: 1500,
        concurrency: 1,
    };
    const maxImageBytes = limits.maxImageMb * 1024 * 1024;

    const jsonSchema = z
        .object({
            imageUrl: z.url({ protocol: /^https?$/ }).optional(),
            imageBase64: z.string().min(1).optional(),
            mimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/i).default("image/png"),
            prompt: z.string().min(1).max(4000).default(DEFAULT_PROMPT),
            maxTokens: z.coerce.number().int().min(1).default(limits.defaultTokens),
            // doctags keeps the `extract-pdf` client contract: it converts
            // `result` to HTML itself. Ask for "html" to get it sanitized here.
            output: z.enum(["doctags", "html"]).default("doctags"),
        })
        .refine((body) => Boolean(body.imageUrl || body.imageBase64), {
            message: "Provide imageUrl or imageBase64, or send the image itself as the body.",
        });

    // Options for a raw image body come from the query string.
    const querySchema = z.object({
        prompt: z.string().min(1).max(4000).default(DEFAULT_PROMPT),
        maxTokens: z.coerce.number().int().min(1).default(limits.defaultTokens),
        output: z.enum(["doctags", "html"]).default("doctags"),
    });

    // ── Model warmup ─────────────────────────────────────────────────────────
    // Loading downloads ~1 GB on a cold Space and takes minutes, so warmup
    // starts the load and answers at once. initializeModel() deduplicates
    // concurrent calls and retries after a failure.
    let loading = false;
    let loadError = null;

    function startWarmup() {
        if (model.isModelLoaded() || loading) return;
        loading = true;
        loadError = null;
        model
            .initializeModel()
            .catch((error) => {
                loadError = messageOf(error);
                console.error("Model warmup failed:", error);
            })
            .finally(() => {
                loading = false;
            });
    }

    const modelState = () => ({
        modelLoaded: model.isModelLoaded(),
        loading,
        ...(loadError ? { loadError } : {}),
    });

    // Default on: a Space that has just booted is about to be used.
    if (env.DOCLING_WARMUP_ON_START !== "false") startWarmup();

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

    app.use("*", async (c, next) => {
        await next();
        c.header("Cache-Control", "no-store");
    });

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
            endpoints: ["GET /health", "POST /api/v1/warmup", "POST /api/v1/convert"],
            limits,
        }),
    );

    app.get("/health", (c) =>
        c.json({
            status: "healthy",
            ...modelState(),
            busy,
            queueDepth: queue.length,
            uptime: Date.now() - startTime,
            limits,
        }),
    );

    // No token: it takes no input, does nothing once the model is loaded, and
    // a caller (the demo page) can wake a sleeping Space without a secret.
    const warmup = (c) => {
        startWarmup();
        const state = modelState();
        return c.json({ success: true, ...state }, state.modelLoaded ? 200 : 202);
    };
    app.get("/api/v1/warmup", warmup);
    app.post("/api/v1/warmup", warmup);

    // base64 inflates by 4/3, plus room for the rest of the JSON body.
    const limitBody = bodyLimit({
        maxSize: Math.ceil((maxImageBytes * 4) / 3) + 64 * 1024,
        onError: (c) => fail(c, 413, "TOO_LARGE", `Request body is too large (image limit ${limits.maxImageMb} MB).`),
    });

    async function convert(c) {
        const denied = authorize(c);
        if (denied) return denied;

        const request = await readRequest(c);
        if (request.error) return request.error;
        const { body, image: source } = request;

        if (pending() >= limits.maxQueue) {
            c.header("Retry-After", "30");
            return fail(c, 503, "BUSY", `Queue is full (${pending()} jobs). Retry later.`);
        }

        let image;
        try {
            image = await model.load_image(await source());
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
                    maxTokens: Math.min(body.maxTokens, limits.maxTokens),
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
            console.error("Docling conversion failed:", messageOf(error));
            return fail(c, 500, "PROCESSING_ERROR", messageOf(error));
        } finally {
            // Nothing outlives the request; drop the decoded pixels now.
            image = null;
        }
    }

    /**
     * Parses either request shape: the image itself as the body (`image/*`,
     * options in the query string) or JSON. Returns the options and a thunk
     * that yields the image as an in-memory Blob.
     */
    async function readRequest(c) {
        const type = c.req.header("content-type") ?? "";

        if (/^image\//i.test(type)) {
            const parsed = querySchema.safeParse(c.req.query());
            if (!parsed.success) return { error: invalid(c, parsed.error.issues) };
            const bytes = await c.req.arrayBuffer();
            if (bytes.byteLength === 0) return { error: fail(c, 400, "INVALID_REQUEST", "The image body is empty.") };
            if (bytes.byteLength > maxImageBytes) return { error: tooLarge(c) };
            const mimeType = type.split(";")[0].trim();
            return { body: parsed.data, image: async () => new Blob([bytes], { type: mimeType }) };
        }

        const parsed = jsonSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return { error: invalid(c, parsed.error.issues) };
        const body = parsed.data;

        if (body.imageUrl) return { body, image: () => downloadImage(body.imageUrl) };

        const base64 = body.imageBase64.replace(/^data:[^;,]+;base64,/, "").replace(/\s+/g, "");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
            return { error: fail(c, 400, "IMAGE_LOAD_ERROR", "imageBase64 is not valid base64.") };
        }
        if ((base64.length * 3) / 4 > maxImageBytes) return { error: tooLarge(c) };
        // A Blob, not a data: URL: in Node, transformers.js reads any string
        // that is not http(s) or blob: as a file path.
        return { body, image: async () => new Blob([Buffer.from(base64, "base64")], { type: body.mimeType }) };
    }

    /** Fetches `imageUrl` into memory, enforcing the size limit and a timeout. */
    async function downloadImage(url) {
        const res = await fetchImage(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) });
        if (!res.ok) throw new Error(`Fetching imageUrl failed with HTTP ${res.status}.`);
        if (Number(res.headers.get("content-length") || 0) > maxImageBytes) throw new Error("Image is too large.");
        const bytes = await res.arrayBuffer();
        if (bytes.byteLength > maxImageBytes) throw new Error("Image is too large.");
        return new Blob([bytes], { type: res.headers.get("content-type") || "image/png" });
    }

    const tooLarge = (c) => fail(c, 413, "TOO_LARGE", `Image is larger than ${limits.maxImageMb} MB.`);

    // /convert-base64 is the path extract-pdf's `processorUrl` client calls.
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

function invalid(c, issues) {
    return c.json({ success: false, error: "Invalid request.", code: "INVALID_REQUEST", issues }, 400);
}

function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}

function positiveInt(value, fallback) {
    const number = Number.parseInt(value ?? "", 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

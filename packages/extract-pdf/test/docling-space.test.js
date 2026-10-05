import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createApp } from "../docling-space/server/app.js";

const PNG = "iVBORw0KGgoAAAANSUhEUg==";

/** A fake of ./model.js whose generations resolve when the test says so. */
function fakeModel({ doctags = "<text>Hello</text>" } = {}) {
    const calls = [];
    const gates = [];
    const loads = [];
    const images = [];
    let loaded = false;
    return {
        calls,
        gates,
        loads,
        images,
        finishLoad: () => {
            loaded = true;
            loads.shift()?.();
        },
        model: {
            initializeModel: () =>
                new Promise((resolve) => {
                    loads.push(resolve);
                }),
            isModelLoaded: () => loaded,
            load_image: async (blob) => {
                images.push(blob);
                return { type: blob.type, bytes: new Uint8Array(await blob.arrayBuffer()) };
            },
            generateFromImage: (opts) => {
                calls.push(opts);
                return new Promise((resolve) =>
                    gates.push(() => resolve({ generatedText: doctags })),
                );
            },
        },
    };
}

function setup({ env = {}, ...fake } = {}) {
    const f = fakeModel(fake);
    const app = createApp({
        model: f.model,
        renderHtml: (doctags) => `<rendered>${doctags}</rendered>`,
        env: { DOCLING_API_TOKEN: "secret", DOCLING_WARMUP_ON_START: "false", ...env },
    });
    const post = (path, body, headers = { "X-Docling-Token": "secret" }) =>
        app.request(path, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(body),
        });
    return { ...f, app, post };
}

/** Lets the fake finish every generation as soon as it starts. */
async function settle(f, response) {
    for (let i = 0; i < 20 && f.gates.length === 0; i++) await Bun.sleep(1);
    while (f.gates.length) f.gates.shift()();
    return response;
}

describe("docling-space API", () => {
    it("answers /health without a token and without loading the model", async () => {
        const { app } = setup();
        const res = await app.request("/health");
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            status: "healthy",
            modelLoaded: false,
            loading: false,
            busy: false,
            queueDepth: 0,
            limits: { maxImageMb: 10, maxQueue: 8, maxTokens: 4096, concurrency: 1 },
        });
        expect(res.headers.get("cache-control")).toBe("no-store");
    });

    it("starts loading the model at boot by default", async () => {
        const f = setup({ env: { DOCLING_WARMUP_ON_START: undefined } });
        expect(f.loads).toHaveLength(1);
        expect(await (await f.app.request("/health")).json()).toMatchObject({ modelLoaded: false, loading: true });
    });

    it("warms up without a token and answers before the model has loaded", async () => {
        const f = setup();
        const first = await f.app.request("/api/v1/warmup", { method: "POST" });
        expect(first.status).toBe(202);
        expect(await first.json()).toEqual({ success: true, modelLoaded: false, loading: true });

        // A second call while loading does not start another load.
        expect((await f.app.request("/api/v1/warmup")).status).toBe(202);
        expect(f.loads).toHaveLength(1);

        f.finishLoad();
        await Bun.sleep(1);
        const done = await f.app.request("/api/v1/warmup");
        expect(done.status).toBe(200);
        expect(await done.json()).toEqual({ success: true, modelLoaded: true, loading: false });
    });

    it("reports a failed load and retries it on the next warmup", async () => {
        const f = setup();
        let attempts = 0;
        f.model.initializeModel = async () => {
            attempts++;
            throw new Error("download failed");
        };
        await f.app.request("/api/v1/warmup");
        await Bun.sleep(1);
        const res = await f.app.request("/api/v1/warmup");
        expect(attempts).toBe(2);
        expect((await res.json()).loading).toBe(true);
        await Bun.sleep(1);
        expect(await (await f.app.request("/health")).json()).toMatchObject({ loadError: "download failed" });
    });

    it("rejects a missing or wrong token", async () => {
        const { post } = setup();
        expect((await post("/api/v1/convert-base64", { imageBase64: PNG }, {})).status).toBe(401);
        expect((await post("/api/v1/convert-base64", { imageBase64: PNG }, { "X-Docling-Token": "nope" })).status).toBe(401);
    });

    it("prefers X-Docling-Token so Authorization can carry a Hugging Face token", async () => {
        const f = setup();
        const res = await settle(
            f,
            f.post("/api/v1/convert-base64", { imageBase64: PNG }, {
                "X-Docling-Token": "secret",
                Authorization: "Bearer hf_space_token",
            }),
        );
        expect((await res).status).toBe(200);
    });

    it("accepts the token as a bearer token too", async () => {
        const f = setup();
        const res = await settle(f, f.post("/api/v1/convert-base64", { imageBase64: PNG }, { Authorization: "Bearer secret" }));
        expect((await res).status).toBe(200);
    });

    it("fails closed in production when no token is configured", async () => {
        const { post } = setup({ env: { DOCLING_API_TOKEN: "", NODE_ENV: "production" } });
        const res = await post("/api/v1/convert", { imageBase64: PNG }, {});
        expect(res.status).toBe(503);
        expect((await res.json()).code).toBe("NOT_CONFIGURED");
    });

    it("is open in development when no token is configured", async () => {
        const f = setup({ env: { DOCLING_API_TOKEN: "" } });
        const res = await (await settle(f, f.post("/api/v1/convert", { imageBase64: PNG }, {})));
        expect(res.status).toBe(200);
    });

    it("returns doctags in `result` by default, the contract extract-pdf's client expects", async () => {
        const f = setup();
        const res = await (await settle(f, f.post("/api/v1/convert-base64", { imageBase64: `data:image/png;base64,${PNG}` })));
        const body = await res.json();
        expect(body).toMatchObject({ success: true, output: "doctags", result: "<text>Hello</text>" });
        expect(body.html).toBeUndefined();
        // Decoded in memory and handed over as a Blob: transformers.js reads
        // a data: URL string as a file path in Node.
        expect(f.calls[0].image).toEqual({ type: "image/png", bytes: new Uint8Array(Buffer.from(PNG, "base64")) });
        expect(f.calls[0].prompt).toBe("Convert this page to docling.");
    });

    it("returns rendered HTML when output is html", async () => {
        const f = setup();
        const res = await (await settle(f, f.post("/api/v1/convert", { imageBase64: PNG, output: "html" })));
        const body = await res.json();
        expect(body.result).toBe("<rendered><text>Hello</text></rendered>");
        expect(body.doctags).toBe("<text>Hello</text>");
    });

    it("takes the image itself as the body, with options in the query string", async () => {
        const f = setup();
        const bytes = Buffer.from(PNG, "base64");
        const res = await settle(
            f,
            f.app.request("/api/v1/convert?output=html&maxTokens=500", {
                method: "POST",
                headers: { "Content-Type": "image/png", "X-Docling-Token": "secret" },
                body: bytes,
            }),
        );
        const body = await (await res).json();
        expect(body).toMatchObject({ success: true, output: "html", result: "<rendered><text>Hello</text></rendered>" });
        expect(f.calls[0].image).toEqual({ type: "image/png", bytes: new Uint8Array(bytes) });
        expect(f.calls[0].maxTokens).toBe(500);
    });

    it("refuses an image past DOCLING_MAX_IMAGE_MB", async () => {
        const f = setup({ env: { DOCLING_MAX_IMAGE_MB: "1" } });
        const res = await f.app.request("/api/v1/convert", {
            method: "POST",
            headers: { "Content-Type": "image/png", "X-Docling-Token": "secret" },
            body: new Uint8Array(1024 * 1024 + 1),
        });
        expect(res.status).toBe(413);
        expect(f.images).toHaveLength(0);
    });

    it("downloads imageUrl into memory", async () => {
        const f = setup();
        const bytes = Buffer.from(PNG, "base64");
        const app = createApp({
            model: f.model,
            renderHtml: (doctags) => doctags,
            env: { DOCLING_API_TOKEN: "secret", DOCLING_WARMUP_ON_START: "false" },
            fetchImage: async () => new Response(bytes, { headers: { "Content-Type": "image/jpeg" } }),
        });
        const res = app.request("/api/v1/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Docling-Token": "secret" },
            body: JSON.stringify({ imageUrl: "https://example.com/page.jpg" }),
        });
        expect((await (await settle(f, res))).status).toBe(200);
        expect(f.calls[0].image).toEqual({ type: "image/jpeg", bytes: new Uint8Array(bytes) });
    });

    it("clamps maxTokens to DOCLING_MAX_TOKENS", async () => {
        const f = setup({ env: { DOCLING_MAX_TOKENS: "2000" } });
        await (await settle(f, f.post("/api/v1/convert-base64", { imageBase64: PNG, maxTokens: 4096 })));
        expect(f.calls[0].maxTokens).toBe(2000);
    });

    it("validates the request body", async () => {
        const { post } = setup();
        expect((await post("/api/v1/convert", {})).status).toBe(400);
        expect((await post("/api/v1/convert", { imageUrl: "file:///etc/passwd" })).status).toBe(400);
        expect((await post("/api/v1/convert", { imageBase64: "not base64!" })).status).toBe(400);
    });

    it("runs one generation at a time and refuses work past DOCLING_MAX_QUEUE", async () => {
        const f = setup({ env: { DOCLING_MAX_QUEUE: "2" } });
        const first = f.post("/api/v1/convert-base64", { imageBase64: PNG });
        const second = f.post("/api/v1/convert-base64", { imageBase64: PNG });
        for (let i = 0; i < 20 && f.gates.length === 0; i++) await Bun.sleep(1);
        await Bun.sleep(5);
        expect(f.calls).toHaveLength(1); // the second waits for the first

        const third = await f.post("/api/v1/convert-base64", { imageBase64: PNG });
        expect(third.status).toBe(503);
        expect((await third.json()).code).toBe("BUSY");

        f.gates.shift()();
        expect((await first).status).toBe(200);
        for (let i = 0; i < 20 && f.gates.length === 0; i++) await Bun.sleep(1);
        f.gates.shift()();
        expect((await second).status).toBe(200);
    });

    it("keeps server/model.js and the Space's copy identical", () => {
        const url = (path) => new URL(path, import.meta.url);
        expect(readFileSync(url("../docling-space/server/model.js"), "utf8")).toBe(
            readFileSync(url("../server/model.js"), "utf8"),
        );
    });
});

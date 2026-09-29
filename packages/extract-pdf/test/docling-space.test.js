import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createApp } from "../docling-space/server/app.js";

const PNG = "iVBORw0KGgoAAAANSUhEUg==";

/** A fake of ./model.js whose generations resolve when the test says so. */
function fakeModel({ doctags = "<text>Hello</text>" } = {}) {
    const calls = [];
    const gates = [];
    let loaded = false;
    return {
        calls,
        gates,
        model: {
            initializeModel: async () => {
                loaded = true;
            },
            isModelLoaded: () => loaded,
            load_image: async (src) => ({ src }),
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
        env: { DOCLING_API_TOKEN: "secret", ...env },
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
        expect(await res.json()).toMatchObject({ status: "healthy", modelLoaded: false, busy: false, queueDepth: 0 });
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
        const res = await post("/api/v1/warmup", {}, {});
        expect(res.status).toBe(503);
        expect((await res.json()).code).toBe("NOT_CONFIGURED");
    });

    it("is open in development when no token is configured", async () => {
        const { post } = setup({ env: { DOCLING_API_TOKEN: "" } });
        const res = await post("/api/v1/warmup", {}, {});
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, modelLoaded: true });
    });

    it("returns doctags in `result` by default, the contract extract-pdf's client expects", async () => {
        const f = setup();
        const res = await (await settle(f, f.post("/api/v1/convert-base64", { imageBase64: `data:image/png;base64,${PNG}` })));
        const body = await res.json();
        expect(body).toMatchObject({ success: true, output: "doctags", result: "<text>Hello</text>" });
        expect(body.html).toBeUndefined();
        expect(f.calls[0].image).toEqual({ src: `data:image/png;base64,${PNG}` });
        expect(f.calls[0].prompt).toBe("Convert this page to docling.");
    });

    it("returns rendered HTML when output is html", async () => {
        const f = setup();
        const res = await (await settle(f, f.post("/api/v1/convert", { imageBase64: PNG, output: "html" })));
        const body = await res.json();
        expect(body.result).toBe("<rendered><text>Hello</text></rendered>");
        expect(body.doctags).toBe("<text>Hello</text>");
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

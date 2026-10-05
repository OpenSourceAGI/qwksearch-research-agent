import { describe, expect, it } from "vitest";
import { CiteLLMError, DEFAULT_MODEL, OPENROUTER_BASE_URL, callLLM, parseJSONReply } from "../src/llm/call-llm";
import { extractCiteLLM } from "../src/llm/extract-cite-llm";
import { ARTICLE_HTML, ARTICLE_URL, GOOD_REPLY, mockModelFetch } from "./fixtures";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("callLLM", () => {
  it("defaults to OpenRouter and sends the key, model and prompts", async () => {
    const { fn, calls } = mockModelFetch({ ok: true });
    const out = await callLLM({ apiKey: "sk-test", system: "sys", user: "usr", fetch: fn });

    expect(calls[0].url).toBe(`${OPENROUTER_BASE_URL}/chat/completions`);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(calls[0].body.model).toBe(DEFAULT_MODEL);
    expect(calls[0].body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "usr" },
    ]);
    expect(out.json).toEqual({ ok: true });
  });

  it("honors a custom model and base URL", async () => {
    const { fn, calls } = mockModelFetch({});
    await callLLM({ apiKey: "k", model: "openai/gpt-4o", baseUrl: "https://api.openai.com/v1/", system: "", user: "", fetch: fn });
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0].body.model).toBe("openai/gpt-4o");
  });

  it("rejects without a key", async () => {
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      await expect(callLLM({ system: "", user: "" })).rejects.toMatchObject({ name: "CiteLLMError", status: 401 });
    } finally {
      if (saved) process.env.OPENROUTER_API_KEY = saved;
    }
  });

  it("surfaces an HTTP error from the provider", async () => {
    const { fn } = mockModelFetch({}, 429);
    await expect(callLLM({ apiKey: "k", system: "", user: "", fetch: fn })).rejects.toThrow(/boom/);
  });

  it("parses fenced and chatty JSON replies", () => {
    expect(parseJSONReply('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJSONReply('Sure! {"a":1} Hope that helps')).toEqual({ a: 1 });
    expect(() => parseJSONReply("no json here")).toThrow(CiteLLMError);
  });
});

describe("extractCiteLLM", () => {
  const run = (reply: unknown, extra: object = {}) => {
    const { fn, calls } = mockModelFetch(reply);
    const result = extractCiteLLM({
      url: ARTICLE_URL,
      html: ARTICLE_HTML,
      apiKey: "k",
      accessedDate: "2026-10-05",
      fetch: fn,
      ...extra,
    });
    return { result, calls };
  };

  it("completes the citation, scores it, and writes every style", async () => {
    const { result } = run(GOOD_REPLY);
    const out = await result;

    expect(out.citation.title).toBe("Oceans Hit Record Heat");
    expect(out.citation.publishedDate).toBe("2024-03-05");
    expect(out.citation.authors.map((a) => a.family)).toEqual(["Santos", "Okafor"]);
    expect(out.confidence.title).toBeGreaterThan(0.9);
    expect(out.needsReview).toEqual([]);
    expect(out.model).toBe("test/model");
    expect(Object.keys(out.formatted).sort()).toEqual(["apa", "bibtex", "chicago", "harvard", "ieee", "mla"]);
    expect(out.formatted.apa?.text).toBe(
      "Santos, M., & Okafor, J.-P. (2024, March 5). Oceans Hit Record Heat. Example Times. " + ARTICLE_URL
    );
  });

  it("extracts author qualifications that the page supports", async () => {
    const out = await run(GOOD_REPLY).result;
    const [santos, okafor] = out.citation.authors;
    expect(santos.qualifications?.jobTitle).toBe("senior climate correspondent");
    expect(santos.qualifications?.credentials).toEqual(["PhD in oceanography"]);
    expect(okafor.qualifications).toBeUndefined();
  });

  it("hands the regex partial and the missing parts to the model", async () => {
    const { result, calls } = run(GOOD_REPLY);
    const out = await result;
    const user: string = calls[0].body.messages[1].content;

    expect(out.partial.title).toBeTruthy();
    expect(user).toContain("Candidates from the regex pass");
    expect(user).toContain("Still missing");
    for (const field of out.missing) expect(user).toContain(field);
    expect(out.missing).toContain("doi");
    expect(user).toContain("Maria Santos is a senior climate correspondent");
    // The page's text is fenced as data, with the instruction to ignore it.
    expect(calls[0].body.messages[0].content).toContain("untrusted data");
  });

  it("marks fields the regex pass and the model agree on as both", async () => {
    const out = await run(GOOD_REPLY).result;
    expect(out.origin.title).toBe("both");
    expect(out.origin.doi).toBeUndefined();
  });

  it("flags low-confidence parts for review", async () => {
    const reply = clone(GOOD_REPLY);
    reply.publishedDate.confidence = 0.4;
    reply.publishedDate.needsReview = true;
    reply.publishedDate.note = "only a copyright year";
    const out = await run(reply).result;

    const item = out.needsReview.find((r) => r.field === "publishedDate");
    expect(item?.reason).toContain("only a copyright year");
    expect(item?.confidence).toBeLessThan(0.7);
  });

  it("respects a custom reviewThreshold", async () => {
    const reply = clone(GOOD_REPLY);
    reply.containerTitle.confidence = 0.75;
    expect((await run(reply).result).needsReview.map((r) => r.field)).not.toContain("containerTitle");
    const strict = await run(reply, { reviewThreshold: 0.9 }).result;
    expect(strict.needsReview.map((r) => r.field)).toContain("containerTitle");
  });

  it("flags an author the page never prints and caps their confidence", async () => {
    const reply = clone(GOOD_REPLY);
    reply.authors.items[0] = { ...reply.authors.items[0], name: "Zed Hallucinated", given: "Zed", family: "Hallucinated" };
    const out = await run(reply).result;

    expect(out.confidence.authors).toBeLessThanOrEqual(0.2);
    expect(out.needsReview.find((r) => r.field === "authors")?.reason).toContain("does not appear");
  });

  it("discards qualifications whose quoted bio is not on the page", async () => {
    const reply = clone(GOOD_REPLY);
    reply.authors.items[0].qualifications.evidence = "Santos won a Pulitzer Prize in 2019.";
    const out = await run(reply).result;

    expect(out.citation.authors[0].qualifications).toBeUndefined();
    expect(out.needsReview.some((r) => r.field === "qualifications:Maria Santos")).toBe(true);
  });

  it("rejects an invalid date instead of printing it", async () => {
    const reply = clone(GOOD_REPLY);
    reply.publishedDate.value = "2024-13-45";
    const out = await run(reply).result;

    expect(out.citation.publishedDate).toBeUndefined();
    expect(out.formatted.apa?.text).toContain("(n.d.)");
    expect(out.needsReview.find((r) => r.field === "publishedDate")?.reason).toContain("not a valid date");
  });

  it("strips markup from model output", async () => {
    const reply = clone(GOOD_REPLY);
    reply.title.value = 'Oceans <script>alert(1)</script>Hit Record Heat';
    const out = await run(reply).result;
    expect(out.citation.title).not.toContain("<");
  });

  it("only writes the requested styles", async () => {
    const out = await run(GOOD_REPLY, { styles: ["mla"] }).result;
    expect(Object.keys(out.formatted)).toEqual(["mla"]);
  });

  it("returns a flagged, usable result when the page has no author", async () => {
    const reply = clone(GOOD_REPLY);
    reply.authors.items = [];
    const out = await run(reply).result;
    expect(out.citation.authors).toEqual([]);
    expect(out.needsReview.find((r) => r.field === "authors")?.reason).toContain("no authors found");
    expect(out.formatted.apa?.text.startsWith("Oceans Hit Record Heat.")).toBe(true);
  });

  it("fetches the URL when no html is given", async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push(String(url));
      if (String(url).startsWith("https://openrouter.ai"))
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(GOOD_REPLY) } }] }));
      return new Response(ARTICLE_HTML, { headers: { "content-type": "text/html" } });
    }) as unknown as typeof fetch;
    const out = await extractCiteLLM({ url: ARTICLE_URL, apiKey: "k", fetch: fetcher });
    expect(calls[0]).toBe(ARTICLE_URL);
    expect(out.citation.title).toBe("Oceans Hit Record Heat");
  });

  it("needs a url, html or text", async () => {
    await expect(extractCiteLLM({ apiKey: "k" })).rejects.toThrow(/url/);
  });
});

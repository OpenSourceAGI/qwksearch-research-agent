/**
 * @fileoverview Verifies that file/image attachments are forwarded to the
 * Vercel AI SDK as multimodal `messages` content parts, and that plain
 * (attachment-free) calls keep using the simpler `prompt` form.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture the exact arguments passed to generateText so we can assert on the
// shape of the request the SDK receives.
const generateTextMock = vi.fn((_args: unknown) => Promise.resolve({ text: "ok" }));

vi.mock("ai", () => ({
  generateText: (args: unknown) => generateTextMock(args),
  stepCountIs: (n: number) => n,
  tool: (t: unknown) => t,
}));

// Return a truthy fake model so writeLanguageResponse proceeds to generateText.
vi.mock("./provider-factory", () => ({
  createLLMProvider: () => ({ id: "fake-model" }),
}));

// Avoid pulling the markdown/prism stack into the test.
vi.mock("./utils/markdown-to-html", () => ({
  convertMarkdownToHTMLEscaped: async (s: string) => s,
}));

import { writeLanguageResponse } from "./generate-response";

afterEach(() => {
  generateTextMock.mockClear();
});

describe("writeLanguageResponse attachments", () => {
  const base = {
    provider: "groq",
    apiKey: "test-key",
    agent: "question",
    query: "Describe the attached file",
    html: false,
    applyContextLimit: false,
  } as const;

  it("sends a plain text prompt when there are no attachments", async () => {
    await writeLanguageResponse({ ...base });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const arg = generateTextMock.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof arg.prompt).toBe("string");
    expect(arg.messages).toBeUndefined();
  });

  it("sends an image attachment as an image content part", async () => {
    await writeLanguageResponse({
      ...base,
      attachments: [
        { mediaType: "image/png", data: "data:image/png;base64,AAAA" },
      ],
    });

    const arg = generateTextMock.mock.calls[0][0] as any;
    expect(arg.prompt).toBeUndefined();
    expect(Array.isArray(arg.messages)).toBe(true);
    const parts = arg.messages[0].content;
    expect(parts[0]).toMatchObject({ type: "text" });
    expect(parts[1]).toMatchObject({
      type: "image",
      image: "data:image/png;base64,AAAA",
    });
  });

  it("sends a document attachment as a file content part with its mediaType", async () => {
    await writeLanguageResponse({
      ...base,
      attachments: [
        {
          mediaType: "application/pdf",
          data: "JVBERi0=",
          filename: "report.pdf",
        },
      ],
    });

    const arg = generateTextMock.mock.calls[0][0] as any;
    const parts = arg.messages[0].content;
    expect(parts[1]).toMatchObject({
      type: "file",
      mediaType: "application/pdf",
      data: "JVBERi0=",
      filename: "report.pdf",
    });
  });

  it("skips malformed attachments (missing data or mediaType)", async () => {
    await writeLanguageResponse({
      ...base,
      attachments: [
        { mediaType: "", data: "x" } as any,
        { mediaType: "image/png" } as any,
        { mediaType: "image/jpeg", data: "data:image/jpeg;base64,BBBB" },
      ],
    });

    const arg = generateTextMock.mock.calls[0][0] as any;
    const parts = arg.messages[0].content;
    // 1 text part + 1 valid image part only.
    expect(parts).toHaveLength(2);
    expect(parts[1]).toMatchObject({ type: "image" });
  });
});

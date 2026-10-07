import { describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";
import {
  contentToText,
  firstWords,
  pageOutline,
  parseContentCheck,
  prepareContent,
} from "../src/llm/content-check";
import { extractCiteLLM } from "../src/llm/extract-cite-llm";
import { CONTENT_CHECK_PROMPT, SYSTEM_PROMPT } from "../src/llm/prompt";
import { ARTICLE_HTML, ARTICLE_URL, GOOD_REPLY, PAYWALL_HTML, mockModelFetch } from "./fixtures";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const PAYWALL_CHECK = {
  verdict: "paywalled",
  confidence: 0.92,
  signals: ["Subscribe to continue reading", "Already a subscriber? Sign in", "You have reached your free article limit"],
  note: "Only the first paragraph is there; a subscribe wall cuts off the rest.",
  contentSelector: "article.story-body",
  tips: [
    { region: "header", selector: "header.site-header", example: "Sign in Subscribe now", tip: "Drop the site header and its sign-in links." },
    { region: "nav", selector: "nav#main-nav", example: "Markets Economy Opinion", tip: "Drop the section menu." },
    { region: "sidebar", selector: "aside.sidebar", example: "Most read", tip: "Drop the most-read list beside the story." },
    { region: "footer", selector: "div.made-up-footer", example: "Copyright Example Ledger", tip: "Drop the legal footer." },
    { region: "ads", selector: "div[", example: "Buy now and save", tip: "Drop ads." },
  ],
};

describe("content helpers", () => {
  it("keeps words apart across tags and drops scripts", () => {
    expect(contentToText("<p>Home</p><p>News</p><script>var x=1</script>")).toBe("Home News");
    expect(contentToText("plain   text\nhere")).toBe("plain text here");
  });

  it("takes the first words and marks the cut", () => {
    expect(firstWords("a b c d", 10)).toBe("a b c d");
    expect(firstWords("a b c d", 2)).toBe("a b […]");
  });

  it("outlines the page's blocks as selectors", () => {
    const outline = pageOutline(parseHTML(PAYWALL_HTML).document);
    expect(outline).toContain("header.site-header");
    expect(outline).toContain("nav#main-nav");
    expect(outline).toContain("article.story-body");
    expect(outline).toContain("aside.sidebar");
    expect(outline).toMatch(/footer\.site-footer \(\d+ words\) "Copyright Example Ledger/);
  });

  it("checks the extracted content when given, else the page text", () => {
    const page = prepareContent(PAYWALL_HTML);
    expect(page.text).toContain("Most read");
    const extracted = prepareContent(PAYWALL_HTML, { content: "<p>The central bank raised rates.</p>" });
    expect(extracted.text).toBe("The central bank raised rates.");
    expect(extracted.words).toBe(5);
    expect(prepareContent(PAYWALL_HTML, { words: 4 }).words).toBe(4);
  });
});

describe("parseContentCheck", () => {
  const input = prepareContent(PAYWALL_HTML);

  it("keeps a verdict, the phrases that are in the text and the selectors that match", () => {
    const check = parseContentCheck(PAYWALL_CHECK, input, input.text);
    expect(check.verdict).toBe("paywalled");
    expect(check.isFullContent).toBe(false);
    expect(check.signals).toEqual(["Subscribe to continue reading", "Already a subscriber? Sign in"]);
    expect(check.contentSelector).toBe("article.story-body");
    expect(check.tips.map((t) => t.selector)).toEqual([
      "header.site-header",
      "nav#main-nav",
      "aside.sidebar",
      undefined, // matches nothing on the page
      undefined, // not a valid selector
    ]);
    expect(check.tips[4].example).toBeUndefined(); // not in the text
    expect(check.selectors).toEqual({
      content: ["article.story-body"],
      remove: ["header.site-header", "nav#main-nav", "aside.sidebar"],
    });
  });

  it("drops a bare tag that would cut or keep too much", () => {
    const check = parseContentCheck(
      {
        verdict: "full",
        confidence: 0.8,
        contentSelector: "main",
        tips: [
          { region: "other", selector: "div", tip: "Drop every div." },
          { region: "nav", selector: "nav", tip: "Drop the menu." },
        ],
      },
      input,
      input.text
    );
    expect(check.tips.map((t) => t.selector)).toEqual([undefined, "nav"]);
    expect(check.contentSelector).toBe("main");
    expect(parseContentCheck({ verdict: "full", contentSelector: "div" }, input, input.text).contentSelector).toBeUndefined();
  });

  it("leaves bare, unnamed blocks out of the outline", () => {
    const outline = pageOutline(parseHTML('<body><div class="md:flex"><p>one two three four</p></div></body>').document);
    expect(outline).toBe("");
  });

  it("reads a missing or unknown verdict as unknown with no confidence", () => {
    expect(parseContentCheck(undefined, input, input.text)).toMatchObject({ verdict: "unknown", confidence: 0, isFullContent: false });
    expect(parseContentCheck({ verdict: "maybe", confidence: 1 }, input, input.text).verdict).toBe("unknown");
  });

  it("strips markup and falls back to other for an unknown region", () => {
    const check = parseContentCheck(
      { verdict: "full", confidence: 0.8, tips: [{ region: "banner", tip: "Drop <b>the</b> banner." }, { region: "nav" }] },
      input,
      input.text
    );
    expect(check.tips).toEqual([{ region: "other", selector: undefined, example: undefined, tip: "Drop the banner." }]);
  });
});

describe("extractCiteLLM content check", () => {
  const run = (reply: unknown, extra: object = {}) => {
    const { fn, calls } = mockModelFetch(reply);
    const result = extractCiteLLM({ url: ARTICLE_URL, html: PAYWALL_HTML, apiKey: "k", accessedDate: "2026-10-05", fetch: fn, ...extra });
    return { result, calls };
  };

  it("sends the content and outline and asks for the check", async () => {
    const { result, calls } = run(GOOD_REPLY);
    await result;
    const [system, user] = calls[0].body.messages.map((m: { content: string }) => m.content);
    expect(system).toBe(SYSTEM_PROMPT + CONTENT_CHECK_PROMPT);
    expect(system).toContain("paywalled");
    expect(user).toMatch(/<content words="\d+">/);
    expect(user).toContain("<outline>");
    expect(user).toContain("aside.sidebar");
    // Still fenced inside <page>.
    expect(user.indexOf("<content")).toBeLessThan(user.lastIndexOf("</page>"));
  });

  it("sends the extracted content instead of the page text when given", async () => {
    const { result, calls } = run(GOOD_REPLY, { content: "<p>Only the extracted article body.</p>" });
    await result;
    expect(calls[0].body.messages[1].content).toContain('<content words="5">\nOnly the extracted article body.\n</content>');
  });

  it("returns the check and flags a paywall for review", async () => {
    const reply = { ...clone(GOOD_REPLY), contentCheck: PAYWALL_CHECK };
    const out = await run(reply).result;
    expect(out.contentCheck?.verdict).toBe("paywalled");
    expect(out.contentCheck?.selectors.remove).toContain("aside.sidebar");
    const item = out.needsReview.find((r) => r.field === "content");
    expect(item?.reason).toMatch(/^paywalled: Only the first paragraph/);
  });

  it("does not flag a full article", async () => {
    const out = await run(GOOD_REPLY, { html: ARTICLE_HTML }).result;
    expect(out.contentCheck).toMatchObject({ verdict: "full", isFullContent: true, contentSelector: "article" });
    expect(out.needsReview).toEqual([]);
  });

  it("can be turned off", async () => {
    const { result, calls } = run(GOOD_REPLY, { checkContent: false });
    const out = await result;
    expect(out.contentCheck).toBeUndefined();
    expect(calls[0].body.messages[0].content).toBe(SYSTEM_PROMPT);
    expect(calls[0].body.messages[1].content).not.toContain("<content");
  });
});

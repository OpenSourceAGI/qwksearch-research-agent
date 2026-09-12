import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTurnstileConfig, TURNSTILE_VERIFY_PATH } from "../config";
import { handleTurnstileGate, safeRedirectTarget, TURNSTILE_COOKIE_NAME } from "../gate";
import { decideChallenge, isCrawlerRequest, isMobileRequest } from "../request-filter";
import { buildPassCookie, mintPassToken, readCookie, verifyPassToken } from "../session";

const SECRET = "0x4AAAAAAAsecret";
const SITE_KEY = "0x4AAAAAAAsitekey";
const ENV = { TURNSTILE_SITE_KEY: SITE_KEY, TURNSTILE_SECRET_KEY: SECRET };

const DESKTOP_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  accept: "text/html,application/xhtml+xml",
};

const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function pageRequest(path = "/", headers: Record<string, string> = {}) {
  return new Request(`https://example.com${path}`, { headers: { ...DESKTOP_HEADERS, ...headers } });
}

/** Stubs the siteverify call so no test reaches the network. */
function stubSiteverify(body: Record<string, unknown>, ok = true) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function verifyRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request(`https://example.com${TURNSTILE_VERIFY_PATH}`, { method: "POST", body: form });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveTurnstileConfig", () => {
  it("is off until both keys are present", () => {
    expect(resolveTurnstileConfig(undefined)).toBeNull();
    expect(resolveTurnstileConfig({})).toBeNull();
    expect(resolveTurnstileConfig({ TURNSTILE_SITE_KEY: SITE_KEY })).toBeNull();
    expect(resolveTurnstileConfig({ TURNSTILE_SECRET_KEY: SECRET })).toBeNull();
    expect(resolveTurnstileConfig(ENV)).not.toBeNull();
  });

  it("can be switched off without removing the keys", () => {
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_ENABLED: "false" })).toBeNull();
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_ENABLED: "OFF" })).toBeNull();
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_ENABLED: "true" })).not.toBeNull();
  });

  it("clamps the TTL and falls back to a week on junk", () => {
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_TTL_SECONDS: "nonsense" })?.ttlSeconds).toBe(604_800);
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_TTL_SECONDS: "1" })?.ttlSeconds).toBe(300);
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_TTL_SECONDS: "99999999" })?.ttlSeconds).toBe(2_592_000);
    expect(resolveTurnstileConfig({ ...ENV, TURNSTILE_TTL_SECONDS: "3600" })?.ttlSeconds).toBe(3600);
  });
});

describe("pass token", () => {
  it("round-trips a token it signed itself", async () => {
    const token = await mintPassToken(SECRET, 60);
    await expect(verifyPassToken(SECRET, token)).resolves.toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await mintPassToken(SECRET, 60);
    await expect(verifyPassToken("other-secret", token)).resolves.toBe(false);
  });

  it("rejects a hand-written or tampered token", async () => {
    await expect(verifyPassToken(SECRET, "1")).resolves.toBe(false);
    await expect(verifyPassToken(SECRET, "v1.9999999999.nonce.signature")).resolves.toBe(false);

    const token = await mintPassToken(SECRET, 60);
    const [version, expiry, nonce, signature] = token.split(".");
    // Extending the expiry must invalidate the signature that covers it.
    await expect(verifyPassToken(SECRET, `${version}.${Number(expiry) + 86_400}.${nonce}.${signature}`)).resolves.toBe(
      false,
    );
  });

  it("rejects an expired token", async () => {
    const now = 1_700_000_000;
    const token = await mintPassToken(SECRET, 60, now);
    await expect(verifyPassToken(SECRET, token, now + 30)).resolves.toBe(true);
    await expect(verifyPassToken(SECRET, token, now + 61)).resolves.toBe(false);
  });

  it("reads its cookie back out of a Cookie header", () => {
    const request = new Request("https://example.com/", {
      headers: { cookie: `other=1; ${TURNSTILE_COOKIE_NAME}=abc.def; another=2` },
    });
    expect(readCookie(request, TURNSTILE_COOKIE_NAME)).toBe("abc.def");
    expect(readCookie(request, "missing")).toBeNull();
  });

  it("marks the cookie HttpOnly and drops Secure off plain http", () => {
    const https = buildPassCookie({ name: "p", token: "t", ttlSeconds: 60, secure: true });
    expect(https).toContain("HttpOnly");
    expect(https).toContain("SameSite=Lax");
    expect(https).toContain("Secure");
    expect(buildPassCookie({ name: "p", token: "t", ttlSeconds: 60, secure: false })).not.toContain("Secure");
    expect(buildPassCookie({ name: "p", token: "t", ttlSeconds: 60, secure: true, domain: ".example.com" })).toContain(
      "Domain=.example.com",
    );
  });
});

describe("decideChallenge", () => {
  const decide = (request: Request) => decideChallenge(request, new URL(request.url));

  it("challenges a desktop browser's first page view", () => {
    expect(decide(pageRequest("/search"))).toEqual({ challenge: true, reason: "challenge" });
  });

  it("never challenges a phone", () => {
    expect(decide(pageRequest("/", { "user-agent": PHONE_UA })).reason).toBe("mobile");
    expect(decide(pageRequest("/", { "sec-ch-ua-mobile": "?1" })).reason).toBe("mobile");
    // A Chromium desktop sends the same hint with ?0 and is still challenged.
    expect(decide(pageRequest("/", { "sec-ch-ua-mobile": "?0" })).challenge).toBe(true);
  });

  it("never challenges a search-engine or link-preview crawler", () => {
    expect(decide(pageRequest("/", { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" })).reason).toBe(
      "crawler",
    );
    expect(decide(pageRequest("/", { "user-agent": "facebookexternalhit/1.1" })).reason).toBe("crawler");
  });

  it("never challenges API calls, assets or well-known paths", () => {
    for (const path of [
      "/api/agent/chat",
      "/_next/static/chunk.js",
      "/_vinext/image",
      "/.well-known/security.txt",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.ico",
      "/manifest.webmanifest",
      "/sw.js",
      "/logo.svg",
    ]) {
      expect(decide(pageRequest(path)).reason, path).toBe("exempt-path");
    }
  });

  it("never challenges a non-document fetch", () => {
    expect(decide(pageRequest("/", { "sec-fetch-dest": "empty", "sec-fetch-mode": "cors" })).reason).toBe(
      "not-a-document",
    );
    expect(decide(pageRequest("/", { rsc: "1" })).reason).toBe("not-a-document");
    expect(decide(pageRequest("/dashboard?_rsc=abc123")).reason).toBe("not-a-document");
    expect(decide(pageRequest("/", { "next-router-prefetch": "1" })).reason).toBe("not-a-document");
  });

  it("never challenges a write", () => {
    const post = new Request("https://example.com/settings", { method: "POST", headers: DESKTOP_HEADERS });
    expect(decide(post).reason).toBe("unsafe-method");
  });

  it("falls back to Accept when the browser sends no Sec-Fetch headers", () => {
    const legacy = new Request("https://example.com/", {
      headers: { "user-agent": DESKTOP_HEADERS["user-agent"], accept: "text/html" },
    });
    expect(decide(legacy).challenge).toBe(true);

    const json = new Request("https://example.com/", {
      headers: { "user-agent": DESKTOP_HEADERS["user-agent"], accept: "application/json" },
    });
    expect(decide(json).reason).toBe("not-a-document");
  });

  it("treats a Cloudflare-verified bot as a crawler", () => {
    const request = pageRequest("/", { "user-agent": "SomethingUnlisted/1.0" });
    Object.defineProperty(request, "cf", { value: { verifiedBotCategory: "Search Engine Crawler" } });
    expect(isCrawlerRequest(request)).toBe(true);
    expect(isMobileRequest(request)).toBe(false);
  });
});

describe("safeRedirectTarget", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectTarget("/search?q=hello")).toBe("/search?q=hello");
  });

  it("refuses anything that could leave the origin", () => {
    expect(safeRedirectTarget("//evil.example")).toBe("/");
    expect(safeRedirectTarget("/\\evil.example")).toBe("/");
    expect(safeRedirectTarget("https://evil.example")).toBe("/");
    expect(safeRedirectTarget("")).toBe("/");
    expect(safeRedirectTarget(`/x${String.fromCharCode(13)}${String.fromCharCode(10)}Set-Cookie: a=b`)).toBe("/");
    expect(safeRedirectTarget(`/${"x".repeat(4000)}`)).toBe("/");
    // Bouncing back to the verify endpoint would be a dead end.
    expect(safeRedirectTarget(TURNSTILE_VERIFY_PATH)).toBe("/");
  });
});

describe("handleTurnstileGate", () => {
  it("passes everything through when unconfigured", async () => {
    await expect(handleTurnstileGate(pageRequest("/"), {})).resolves.toBeNull();
    await expect(handleTurnstileGate(pageRequest("/"), undefined)).resolves.toBeNull();
  });

  it("serves the challenge page on a first desktop page view", async () => {
    const response = await handleTurnstileGate(pageRequest("/search?q=a"), ENV);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("x-robots-tag")).toContain("noindex");

    const html = await response!.text();
    expect(html).toContain(`data-sitekey="${SITE_KEY}"`);
    expect(html).toContain(`action="${TURNSTILE_VERIFY_PATH}"`);
    expect(html).toContain('value="/search?q=a"');
    // The secret must never reach the browser.
    expect(html).not.toContain(SECRET);
  });

  it("escapes the redirect it echoes back into the form", async () => {
    // A redirect read off the URL arrives percent-encoded by `URL` itself...
    const fromUrl = await handleTurnstileGate(pageRequest("/a?q=%22%3E%3Cscript%3E"), ENV);
    expect(await fromUrl!.text()).toContain('value="/a?q=%22%3E%3Cscript%3E"');

    // ...but the one posted back to the verify endpoint is raw form text, so
    // the page has to escape it before echoing it into the hidden input.
    const retry = await handleTurnstileGate(
      verifyRequest({ redirect: '/a"><script>alert(1)</script>' }),
      ENV,
    );
    const html = await retry!.text();
    expect(retry?.status).toBe(400);
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&quot;&gt;&lt;script&gt;alert(1)");
  });

  it("lets a verified browser straight through", async () => {
    const token = await mintPassToken(SECRET, 3600);
    const request = pageRequest("/", { cookie: `${TURNSTILE_COOKIE_NAME}=${token}` });
    await expect(handleTurnstileGate(request, ENV)).resolves.toBeNull();
  });

  it("challenges a browser carrying a forged cookie", async () => {
    const forged = await mintPassToken("not-the-secret", 3600);
    const request = pageRequest("/", { cookie: `${TURNSTILE_COOKIE_NAME}=${forged}` });
    const response = await handleTurnstileGate(request, ENV);
    expect(response?.status).toBe(200);
    expect(await response!.text()).toContain("cf-turnstile");
  });

  it("verifies the token server-side and sets a signed cookie", async () => {
    const fetchMock = stubSiteverify({ success: true, hostname: "example.com" });

    const response = await handleTurnstileGate(
      verifyRequest({ "cf-turnstile-response": "token-from-widget", redirect: "/search?q=a" }),
      ENV,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [verifyUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(verifyUrl).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect((init.body as FormData).get("secret")).toBe(SECRET);
    expect((init.body as FormData).get("response")).toBe("token-from-widget");

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/search?q=a");

    const setCookie = response!.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${TURNSTILE_COOKIE_NAME}=`);
    const minted = setCookie.slice(setCookie.indexOf("=") + 1, setCookie.indexOf(";"));
    await expect(verifyPassToken(SECRET, minted)).resolves.toBe(true);
  });

  it("refuses a redirect that would leave the site", async () => {
    stubSiteverify({ success: true, hostname: "example.com" });
    const response = await handleTurnstileGate(
      verifyRequest({ "cf-turnstile-response": "t", redirect: "//evil.example" }),
      ENV,
    );
    expect(response?.headers.get("location")).toBe("/");
  });

  it("sets no cookie when siteverify rejects the token", async () => {
    stubSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    const response = await handleTurnstileGate(verifyRequest({ "cf-turnstile-response": "bad" }), ENV);
    expect(response?.status).toBe(403);
    expect(response?.headers.get("set-cookie")).toBeNull();
  });

  it("sets no cookie when the token was solved for another site", async () => {
    stubSiteverify({ success: true, hostname: "evil.example" });
    const response = await handleTurnstileGate(verifyRequest({ "cf-turnstile-response": "t" }), ENV);
    expect(response?.status).toBe(403);
    expect(response?.headers.get("set-cookie")).toBeNull();
  });

  it("accepts a token solved on a sibling hostname of the widget's domain", async () => {
    stubSiteverify({ success: true, hostname: "www.example.com" });
    const response = await handleTurnstileGate(verifyRequest({ "cf-turnstile-response": "t" }), ENV);
    expect(response?.status).toBe(303);
  });

  it("re-challenges rather than 500s when siteverify is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const response = await handleTurnstileGate(verifyRequest({ "cf-turnstile-response": "t" }), ENV);
    expect(response?.status).toBe(502);
    expect(await response!.text()).toContain("cf-turnstile");
  });

  it("rejects a submission with no token without calling siteverify", async () => {
    const fetchMock = stubSiteverify({ success: true });
    const response = await handleTurnstileGate(verifyRequest({ redirect: "/" }), ENV);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response?.status).toBe(400);
  });

  it("answers a GET on the verify endpoint with 405", async () => {
    const response = await handleTurnstileGate(
      new Request(`https://example.com${TURNSTILE_VERIFY_PATH}`, { headers: DESKTOP_HEADERS }),
      ENV,
    );
    expect(response?.status).toBe(405);
  });
});

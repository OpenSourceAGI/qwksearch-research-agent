// @ts-nocheck
/**
 * @fileoverview Web crawler utility ("Tardigrade") that fetches a URL's raw HTML
 * with bot-detection handling and Cloudflare/JINA fallbacks, plus robots.txt checking.
 */
import { convertHTMLToBasicHTML } from "../html-to-content/html-to-basic-html";
import { convertMarkdownToFormattedHTML } from "../html-to-content/html-utils";
import grab from "../utils/grab";

/**
 * ### Tardigrade the Web Crawler
 * <img src="https://i.imgur.com/iuzpcvD.png" width="350px" />
 *
 * 1. **Use Fetch API, check for bot detection.** Scrape  any domain's URL to get its HTML, JSON, or arraybuffer.<br />
 * Scraping internet pages is a [free speech right
 * ](https://blog.apify.com/is-web-scraping-legal/).
 * 2. Features: timeout, redirects, default UA, referer as google, and bot
 * detection checking. <br />
 * 3. If fetch method does not get needed HTML, use Docker proxy as backup.
 *
 * 4. [Setup Docker](https://github.com/vtempest/ai-research-agent/tree/master/src/crawler)
 *  container with NodeJS server API renders with puppeteer DOM to get all HTML loaded by
 *  secondary in-page API requests after the initial page request, including user login and cookie storage.
 * 5. Bypass Cloudflare bot check: A webpage proxy that request through Chromium (puppeteer) - can be used
 * to bypass Cloudflare anti bot using cookie id javascript method.
 * 6. Send your request to the server with the port 3000 and add your URL to the "url"
 *  query string like this: `http://localhost:3000/?url=https://example.org`
 *
 * 7. Optional: Setup residential IP proxy to access sites that IP-block datacenters
 *  and manage rotation with [Scrapoxy](https://scrapoxy.io). Recommended:
 * [Hypeproxy](https://hypeproxy.io/products/static-residential-proxies)
 * [NinjasProxy](https://ninjasproxy.com/residential-proxies/)
 * [Proxy-Cheap](https://app.proxy-cheap.com/order)
 * [LiveProxies](https://liveproxies.io/rotating-residential-proxies-pricing)
 *
 * @param {string} url - any domain's URL
 * @param {Object} [options]
 * @param {number} options.timeout default=5 -  abort request if not retrived, in seconds
 * @param {number} options.maxRedirects default=3 - max redirects to follow
 * @param {number} options.checkBotDetection default=true - check for bot detection messages
 * @param {number} options.changeReferer default=true - set referer as google
 * @param {number} options.userAgentIndex default=0 - index of [google bot, default chrome]
 * @param {string} options.proxy default=false - use proxy url
 * @param {boolean} options.checkRobotsAllowed default=false - check robots.txt rules
 * @returns {Promise<string>} -  HTML, JSON, arraybuffer, or error object
 * @category Extract
 * @example await scrapeURL("https://hckrnews.com", {timeout: 5, userAgentIndex: 1})
 * @author [vtempest (2025)](https://github.com/vtempest)
 */
export async function scrapeURL(url, options = {}) {
  // try {
  let {
    timeout = 5,
    checkBotDetection = true,
    maxRedirects = 3,
    changeReferer = 0,
    userAgentIndex = 0,
    proxy = null,
    useProxyAsBackup = true,
    checkRobotsAllowed = false,
  } = options;

  if (checkRobotsAllowed) {
    const rules = await fetchScrapingRules(url);
    // isAllowedToScrape matches rule paths with startsWith, so it needs the
    // request path — passing the full URL made every rule (including
    // `Disallow: /`) silently fail to match.
    let requestPath: string;
    try {
      requestPath = new URL(url).pathname;
    } catch {
      requestPath = url;
    }
    if (!isAllowedToScrape(rules, requestPath)) {
      return { error: "Robots.txt forbids to scrape there" };
    }
  }

  if (proxy) url = proxy + url;

  var userAgentStrings = [
    "Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible ; Googlebot/2.1 ; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)",
  ];

  var headers = {
    ...options,
    "User-Agent": userAgentStrings[userAgentIndex],
    signal: AbortSignal.timeout(timeout * 1000),
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
  };

  if (changeReferer) headers["Referer"] = "https://www.google.com/";

  let html;
  try {
    html = await grab(url, { ...headers, responseType: "text" });

    // Check if grab returned an error object instead of HTML
    if (typeof html !== "string" || html.length === 0) {
      throw new Error("grab-url returned invalid data");
    }
  } catch (e) {
    const err = e as Error & { cause?: unknown; status?: number };
    console.error("[scrapeURL] initial fetch failed, trying Cloudflare Puppeteer fallback", {
      url,
      message: err?.message,
      cause: err?.cause,
      status: err?.status,
    });

    // Try Cloudflare Puppeteer scraper first (handles JS and bot detection)
    try {
      html = await scrapeCloudflare(url, { proxy });
      console.log("[scrapeURL] Cloudflare scraper succeeded", { url });
    } catch (cfErr) {
      console.error("[scrapeURL] Cloudflare scraper failed, trying JINA fallback", {
        url,
        error: cfErr,
      });

      // Try JINA as final fallback
      try {
        html = await scrapeJINA(url);
        console.log("[scrapeURL] JINA fallback succeeded", { url });
      } catch (jinaErr) {
        console.error("[scrapeURL] All scraping methods failed", {
          url,
          error: jinaErr,
        });
        throw new Error(`All scraping methods failed: ${err?.message || String(e)}`);
      }
    }
  }

  // if (contentType.includes("application/json")) {
  //   return await response.json();
  // } else
  // if (contentType.includes("text")) {

  if (checkBotDetection && checkHTMLForBotDetection(html)) {
    console.log("[scrapeURL] bot detection found, retrying with Cloudflare scraper", { url });

    try {
      html = await scrapeCloudflare(url, { proxy, bypassCaptcha: true });
      console.log("[scrapeURL] Cloudflare scraper bypassed bot detection", { url });
    } catch (cfErr) {
      console.error("[scrapeURL] Cloudflare scraper failed, trying JINA", { url, error: cfErr });

      try {
        html = await scrapeJINA(url);
        console.log("[scrapeURL] JINA fallback succeeded", { url });
      } catch (jinaErr) {
        console.error("[scrapeURL] All bot bypass methods failed", { url });
        throw new Error("Bot detected and all bypass methods failed");
      }
    }

    // Check again if bot detection still present
    if (checkBotDetection && checkHTMLForBotDetection(html)) {
      console.error("[scrapeURL] bot detected even after all attempts", { url });
      throw new Error("Bot detected even after all attempts");
    }
  }

  return html;
}

/**
 * Scrape with Cloudflare Puppeteer scraper - handles JS rendering and bot detection
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<string>}
 */
async function scrapeCloudflare(url: string, options: { proxy?: string | null, bypassCaptcha?: boolean } = {}): Promise<string> {
  console.log("[scrapeCloudflare] attempting Cloudflare Puppeteer scraper", { url });

  const scraperUrl = typeof process !== 'undefined' && process?.env?.SCRAPER_URL
    ? process.env.SCRAPER_URL
    : 'https://proxy.qwksearch.com';

  const apiKey = typeof process !== 'undefined' && process?.env?.SCRAPER_API_KEY
    ? process.env.SCRAPER_API_KEY
    : undefined;

  // Skip if scraper is not configured
  if (!scraperUrl) {
    console.log("[scrapeCloudflare] SCRAPER_URL not configured, skipping", { url });
    throw new Error('Cloudflare scraper not configured (set SCRAPER_URL env var)');
  }

  try {
    // The deployed scraper worker accepts GET with query-string params.
    const renderUrl = new URL('/api/render', scraperUrl);
    const params: Record<string, string> = {
      url,
      wait: '1000',
      blockImages: 'false',
      sessionId: 'default',
      timeout: '30000',
      waitUntil: 'networkidle2',
      format: 'json',
      bypassCaptcha: String(options.bypassCaptcha ?? true),
      maxRetries: '10',
      ...(options.proxy ? { proxyUrl: options.proxy } : {}),
    };
    for (const [key, value] of Object.entries(params)) {
      renderUrl.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {};

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(renderUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare scraper failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.html) {
      throw new Error('Cloudflare scraper returned no HTML');
    }

    console.log("[scrapeCloudflare] Cloudflare scraper succeeded", {
      url,
      htmlLength: data.html.length,
      loadTime: data.loadTime,
      challengeBypassed: data.challengeBypassed,
    });

    return data.html;
  } catch (error) {
    const err = error as Error;
    console.error("[scrapeCloudflare] Cloudflare scraper failed", {
      url,
      message: err?.message,
    });
    throw new Error(`Cloudflare scraping failed: ${err?.message}`);
  }
}

/**
 * As backup, scrape with JINA to get html
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function scrapeJINA(url) {
  console.log("[scrapeJINA] attempting JINA fallback", { url });

  let articleExtract;
  try {
    const jinaApiKey = typeof process !== 'undefined' && process?.env?.JINA_API_KEY
      ? process.env.JINA_API_KEY
      : undefined;

    const headers: Record<string, string> = {
      'Accept': 'text/html',
    };

    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
    }

    articleExtract = await grab("https://r.jina.ai/" + url, {
      responseType: "text",
      timeout: 30,
      headers,
    });
  } catch (jinaError) {
    const err = jinaError as Error;
    console.error("[scrapeJINA] JINA fetch failed", {
      url,
      message: err?.message,
    });
    throw new Error(`JINA scraping failed: ${err?.message}`);
  }

  if (!articleExtract || typeof articleExtract !== "string") {
    console.error("[scrapeJINA] JINA returned invalid data", {
      url,
      type: typeof articleExtract,
    });
    throw new Error("JINA returned invalid or empty data");
  }

  // Check if JINA returned an authentication error
  if (typeof articleExtract === "string" && articleExtract.includes("AuthenticationRequiredError")) {
    console.error("[scrapeJINA] JINA requires authentication", { url });
    throw new Error("JINA scraping requires API key (set JINA_API_KEY env var)");
  }

  //convert Title: to <title>
  var title = articleExtract.match(/Title: (.*)/)?.[1];

  if (articleExtract.includes("===============\n"))
    articleExtract = articleExtract
      .split("===============\n")
      .slice(1)
      .join(" ");

  var match = articleExtract.match(/Markdown Content:([\s\S]*)/);
  articleExtract = match ? match[1] : articleExtract;

  // JINA returns the article body as Markdown. Convert it to formatted HTML
  // using regexp-based Markdown detection so headers, lists, links, emphasis,
  // and code render correctly downstream.
  articleExtract = convertMarkdownToFormattedHTML(articleExtract);

  if (title) articleExtract = "<title>" + title + "</title>" + articleExtract;

  console.log("[scrapeJINA] JINA scraping succeeded", {
    url,
    hasTitle: !!title,
    htmlLength: articleExtract.length,
  });

  return articleExtract;
}

/**
 * Check html for bot block messages
 * @param {string} html
 * @returns {Boolean} true if bot detection message found
 */
function checkHTMLForBotDetection(html) {
  var commonBlocks = [
    "Error 403 - Unavailable",
    "The security system for this website has been triggered",
    "You do not have permission to view this page.",
    "Our systems have detected unusual traffic from your computer network.",
    "Your request has been blocked due to a network policy.",
    "Cloudflare Ray ID found ",
    "Please verify you are a human",
    "Our systems have detected unusual traffic activity from your network. Please complete this reCAPTCHA",
    "Sorry, we just need to make sure you're not a robot",
    "Access to this page has been denied",
    "<p>Please enable JS and disable any ad blocker",
    "Please make sure your browser supports JavaScript",
    "Please complete the security check to access",
    "https://errors.edgesuite.net",
    "Please enable JS and disable any ad blocker",
    "The resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
    "We\u2019re currently checking your connection. This shouldn\u2019t take long.",
    "Generated by cloudfront (CloudFront)",
    "You don't have permission to access",
    "The request could not be satisfied.",
    "Enable JavaScript and cookies to continue",
    "Something went wrong. Wait a moment and try again.",
    "You\u2019re using a web browser that isn\u2019t supported",
    "403 Forbidden",
    "504 Gateway Timeout",
    "You\u2019re Temporarily Blocked",
    "Our systems have detected unusual activity",
    "Agree & Join LinkedIn",
    "Verifying you are human. This may take a few seconds",
    "500 Internal Server Error",
    "By clicking Continue to join or sign in, you agree to LinkedIn",
    "Enable JS in your browser",
    "Verifying you are human",
    "Your request has been blocked",
    "You've been blocked by network security",
    "You've hit the rate limit.",
  ];

  return (
    typeof html?.indexOf !== "undefined" &&
    commonBlocks.filter((m) => html?.indexOf(m) > -1).length > 0
  );
}

/**
 * Fetches and parses the robots.txt file for a given URL.
 * @param {string} url - The base URL to fetch the robots.txt from.
 * @returns {Promise<Object>} A JSON object representing the parsed robots.txt.
 */
export async function fetchScrapingRules(url) {
  const robotsUrl = `https://${url.split("//")[1].split("/")[0]}/robots.txt`;
  let content = "";
  try {
    content = await grab(robotsUrl, { responseType: "text" });
  } catch (e) {
    return { error: "No robots.txt found" };
  }

  const rules = {
    directives: {},
    crawlDelay: {},
    sitemaps: [],
    preferredHost: null,
  };
  let currentUserAgents = [];

  const lines = content.split("\n");
  for (const line of lines) {
    const [directive, value] = line.split(":").map((s) => s.trim());
    switch (directive.toLowerCase()) {
      case "user-agent":
        currentUserAgents = [value.toLowerCase()];
        break;
      case "disallow":
      case "allow":
        for (const ua of currentUserAgents) {
          rules.directives[ua] = rules.directives[ua] || [];
          rules.directives[ua].push({
            path: value,
            allow: directive.toLowerCase() === "allow",
          });
        }
        break;
      case "crawl-delay":
        for (const ua of currentUserAgents) {
          rules.crawlDelay[ua] = parseFloat(value);
        }
        break;
      case "sitemap":
        rules.sitemaps.push(value);
        break;
      case "host":
        rules.preferredHost = value.toLowerCase();
        break;
    }
  }
  return rules;
}

/**
 * Checks if a given path is allowed for a specific user agent.
 * //TODO cache rules per domain
 * @param {Object} rules - The parsed rules from robots.txt.
 * @param {string} path - The path to check.
 * @param {string} [userAgent='*'] - The user agent to check for.
 * @returns {boolean} True if the path is allowed, false otherwise.
 */
function isAllowedToScrape(rules, path, userAgent = "*") {
  const relevantRules =
    rules.directives[userAgent.toLowerCase()] || rules.directives["*"] || [];
  for (const rule of relevantRules)
    if (path.startsWith(rule.path)) return rule.allow;

  return true; // If no rules match, it's allowed by default
}

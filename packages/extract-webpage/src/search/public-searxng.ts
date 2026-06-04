/**
 * @module research/search/public-searxng
 * @description Research library module.
 */
import { getDomainWithoutSuffix } from "tldts";
import { parseDate } from "chrono-node";
import grab from "grab-url";

/**
 * Search Web via SearXNG metasearch of all major search engines.
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {},
): Promise<SearxngSearchResult[] | SearchResponse> {
  const {
    category = "general",
    recency,
    privateSearxng = null,
    maxRetries = 3,
    page = 1,
    safesearch = false,
    lang = "en-US",
    proxy = null,
  } = options;

  const CATEGORY_LIST = [
    "general",
    "news",
    "videos",
    "images",
    "science",
    "it",
    "files",
    "social+media",
  ];
  const RECENCY_ALLOWED_LIST = ["day", "week", "month", "year"];

  const SEARX_DOMAINS = [
    "baresearch.org",
    "copp.gg",
    "darmarit.org",
    "etsi.me",
    "fairsuch.net",
    "nogoo.me",
    "northboot.xyz",
    "nyc1.sx.ggtyler.dev",
    "ooglester.com",
    "opnxng.com",
    "paulgo.io",
    "priv.au",
    "s.trung.fun",
    "search.blitzw.in",
    "search.charliewhiskey.net",
    "search.citw.lgbt",
    "search.darkness.services",
    "search.datura.network",
    "search.dotone.nl",
    "search.gcomm.ch",
    "search.hbubli.cc",
    "search.im-in.space",
    "search.incogniweb.net",
    "search.inetol.net",
    "search.leptons.xyz",
    "search.nadeko.net",
    "search.ngn.tf",
    "search.ononoki.org",
    "search.privacyredirect.com",
    "search.sapti.me",
    "search.rowie.at",
    "search.projectsegfau.lt",
    "search.tommy-tran.com",
    "searx.aleteoryx.me",
    "searx.ankha.ac",
    "searx.be",
    "searx.colbster937.dev",
    "searx.daetalytica.io",
    "searx.dresden.network",
    "searx.foss.family",
    "searx.hu",
    "searx.juancord.xyz",
    "searx.lunar.icu",
    "searx.mxchange.org",
    "searx.namejeff.xyz",
    "searx.oakleycord.dev",
    "searx.ro",
    "searx.sev.monster",
    "searx.thefloatinglab.world",
    "searx.tiekoetter.com",
    "searx.tuxcloud.net",
    "searx.work",
    "searx.zhenyapav.com",
    "searxng.hweeren.com",
    "searxng.online",
    "searxng.shreven.org",
    "searxng.site",
    "skyrimhater.com",
    "sx.ca.zorby.top",
    "sx.catgirl.cloud",
    "sx.thatxtreme.dev",
    "sx.zorby.top",
    "xo.wtf",
  ];

  //select a random domain if none is provided
  const searchDomain =
    privateSearxng ||
    "https://" +
      SEARX_DOMAINS[Math.floor(Math.random() * SEARX_DOMAINS.length)];

  var categoryName = categoryName == "tech" ? (categoryName = "it") : category;

  let url = `${searchDomain}/search`;

  if (privateSearxng) url += "&format=json";

  //on cloudflare to avoid "Too many redirects" change SSL mode to Full
  if (proxy && !privateSearxng) url = proxy + url;

  let resultHTML: any;
  try {
    resultHTML = await grab(searchDomain + "/search", {
      q: encodeURIComponent(query),
      ["category_" + categoryName]: 1,
      language: lang,
      [privateSearxng && "format"]: "json",
      [recency && RECENCY_ALLOWED_LIST.includes(recency) ? "time_range" : ""]:
        recency,
      safesearch: safesearch ? "1" : "0",
      pageno: page,
      headers: {
        "accept-language": lang + ",en;q=0.9",
      },
    });
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[searchWeb] Failed to fetch from SearXNG domain "${searchDomain}": ${errorMsg}`);
    if (maxRetries > 0) {
      console.log(`[searchWeb] Retrying with another instance... (${maxRetries} retries left)`);
      return await searchWeb(query, {
        ...options,
        maxRetries: maxRetries - 1,
      });
    }
    console.error(`[searchWeb] All retries exhausted. Returning empty results.`);
    return [];
  }

  if (privateSearxng) {
    let parsedData: any;

    // Check if resultHTML is already an object (grab-url auto-parsed JSON)
    if (typeof resultHTML === "object" && resultHTML !== null) {
      parsedData = resultHTML;
    } else if (typeof resultHTML === "string") {
      // It's a string, try to parse it
      if (!resultHTML.startsWith("{")) {
        console.warn(
          "Private SearXNG instance did not return valid JSON, falling back or returning empty",
        );
        return { results: [], suggestions: [], infoboxes: [] };
      }

      try {
        parsedData = JSON.parse(resultHTML);
      } catch (e) {
        console.error("Failed to parse JSON from private instance", e);
        return { results: [], suggestions: [], infoboxes: [] };
      }
    } else {
      console.error("Unexpected resultHTML type:", typeof resultHTML);
      return { results: [], suggestions: [], infoboxes: [] };
    }

    let { results, suggestions, infoboxes } = parsedData;

    results = results.map((result: any) => {
      let title = result.title.replace(/<\/?[^>]+(>|$)/g, "");

      const TITLE_SPLITTERS_RE = /( [|\-\/:\u00bb] )|( - )|(\|)/;

      if (TITLE_SPLITTERS_RE.test(title)) {
        const splitTitle = title.split(TITLE_SPLITTERS_RE);
        // Handle breadcrumbed titles
        if (splitTitle.length >= 2) {
          const longestPart = splitTitle.reduce(
            (acc: string, part: string) =>
              part?.length > acc?.length ? part : acc,
            "",
          );
          if (longestPart.length > 10) {
            title = longestPart;
          }
        }
      }

      title = convertURLSafeHTMLToHTML(title);
      const urlPtr = result.url.replace(/&amp;/g, "&");
      const snippet = result.content?.replace(/<\/?[^>]+(>|$)/g, "");
      const thumbnail = result.thumbnail;
      const score = Math.round(result.score * 100) / 100;

      const domain = result.url
        ?.replace(/(http:\/\/|https:\/\/|www.)/gi, "")
        .split("/")[0];

      let date: string | undefined = undefined;
      let source: string | undefined = undefined;

      if (typeof result.metadata === "string") {
        const parts = result.metadata.split("|").map((s: string) => s.trim());
        if (parts.length > 1) {
          // Basic check
          const dateObj = parseDate(result.metadata);
          date = dateObj ? dateObj.toISOString().split("T")[0] : undefined;
          const sourcePart = parts[1]; // assuming second part might be source
          source = sourcePart || null;
        }
      }

      if (!source && domain) {
        source =
          getDomainWithoutSuffix(domain)?.replace(/\b\w/g, (l) =>
            l.toUpperCase(),
          ) || undefined;
        if (source && source.length < 5) source = source.toUpperCase();
      }

      const favicon = `https://s2.googleusercontent.com/s2/favicons?domain_url=${result.url}`;
      // const favicon =
      //   "https://www.google.com/s2/favicons?domain=" +
      //   result.url.match(
      //     /^(?:https?:\/\/)?(?:www\.)?([^/:?\s]+)(?:[/:?]|$)/i,
      //   )?.[0] +
      //   "&sz=16";

      return {
        title,
        url: urlPtr,
        snippet,
        score,
        ...(date ? { date } : {}),
        ...(source ? { source } : {}),
        domain,
        favicon,
        // Compatibility fields
        content: snippet,
        thumbnail,
        ...(result.img_src ? { img_src: result.img_src } : {}),
        ...(result.iframe_src ? { iframe_src: result.iframe_src } : {}),
      };
    });
    return { results, suggestions: suggestions || [], infoboxes };
  }

  // Public instance scraping (HTML parsing)
  let results: SearxngSearchResult[] = [];
  const resultRegex = /<article class="result[^>]*>[\s\S]*?<\/article>/g;
  const titleUrlRegex = /<h3><a href="([^"]*)"[^>]*>(.*?)<\/a><\/h3>/;
  const snippetRegex = /<p class="content">\s*(.*?)\s*<\/p>/;

  // Unused in current logic but kept from original code for potential future use or completeness
  // const enginesRegex = /<span>(bing|duckduckgo|yahoo|google)<\/span>/g;
  // const linksRegex = /<a href="([^"]*)" class="(cache_link|proxyfied_link)"[^>]*>(cached|proxied)<\/a>/g;

  let match;
  while ((match = resultRegex.exec(resultHTML)) !== null) {
    const resultHtml = match[0];
    const titleUrlMatch = titleUrlRegex.exec(resultHtml);
    const snippetMatch = snippetRegex.exec(resultHtml);

    if (titleUrlMatch && titleUrlMatch[1] && titleUrlMatch[2]) {
      // const urlFound = convertURLSafeHTMLToHTML(titleUrlMatch[1]); // Not used in original, seemingly
      let title = titleUrlMatch[2].replace(/<\/?[^>]+(>|$)/g, "");
      let snippet = snippetMatch
        ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "")
        : "";

      title = convertURLSafeHTMLToHTML(title);
      snippet = convertURLSafeHTMLToHTML(snippet);
      const urlClean = convertURLSafeHTMLToHTML(titleUrlMatch[1]);

      results.push({
        title,
        url: urlClean,
        snippet,
        content: snippet, // Compatibility
      });
    }
  }

  if (results.length === 0 && maxRetries > 0) {
    return (await searchWeb(query, {
      ...options,
      maxRetries: maxRetries - 1,
      useProxy: true,
    })) as SearxngSearchResult[];
  }

  results = results.map((result) => {
    const match = result.url.match(
      /^(?:https?:\/\/)?(?:www\.)?([^/:?\s]+)(?:[/:?]|$)/i,
    );
    const domainStr = match ? match[0] : "";

    const favicon = "https://www.google.com/s2/favicons?domain=" + domainStr;

    const domain = result.url
      ?.replace(/(http:\/\/|https:\/\/|www.)/gi, "")
      .split("/")[0];

    return {
      ...result,
      domain,
      favicon,
      thumbnail: favicon, // Compatibility
    };
  });

  return results;
}

// Wrapper to match existing `searchSearxng` signature if needed elsewhere,
// OR the user might want this to be the primary `searchWeb` and we just export `searchSearxng` that calls it.
// The user's request showed `searchWeb` being imported.
// But the application likely calls `searchSearxng`. Let's reimplement `searchSearxng` to use `searchWeb`.

interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
): Promise<{ results: SearxngSearchResult[]; suggestions: string[] }> => {
  // Adapter to call the new searchWeb
  const category = opts?.categories?.[0] || "general"; // simplistic mapping
  const page = opts?.pageno || 1;
  const lang = opts?.language || "en-US";

  const result = await searchWeb(query, {
    category,
    page,
    lang,
    // privateSearxng: true // or false? The user code said "use custom or false to use the public instances"
    // Let's rely on the default behavior or what `searchWeb` does.
    // However, `searchWeb` logic branches on `privateSearxng` significantly.
    // If we want JSON, we probably want `privateSearxng` set to a domain if we have one, or handle the array return.

    // IMPORTANT: The user code's `GET` handler passes `privateSearxng: publicInstances ? false : searxngDomain`.
    // where `searxngDomain` was imported from `customize-site`.
    // Since we don't have that file, we used empty string defaults.
    // If `searxngDomain` is falsy, `privateSearxng` becomes falsy (or we should be careful).
  });

  if (Array.isArray(result)) {
    return { results: result, suggestions: [] };
  } else {
    return { results: result.results, suggestions: result.suggestions || [] };
  }
};

// Helper function to decode HTML entities
function convertURLSafeHTMLToHTML(html: string): string {
  if (!html) return "";
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

interface SearchOptions {
  category?: string | number;
  recency?: string;
  privateSearxng?: string | boolean | null;
  maxRetries?: number;
  page?: number;
  safesearch?: boolean;
  lang?: string;
  proxy?: string | null;
  useProxy?: boolean;
}

export interface SearxngSearchResult {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
  favicon?: string;
  score?: number;
  source?: string;
  date?: string;
  img_src?: string; // Added for compatibility with existing interfaces
  thumbnail_src?: string; // Added for compatibility
  thumbnail?: string; // Added for compatibility
  content?: string; // Added for compatibility
  author?: string; // Added for compatibility
  iframe_src?: string; // Added for compatibility
}

export interface SearchResponse {
  results: SearxngSearchResult[];
  suggestions: string[];
  infoboxes?: any[];
}

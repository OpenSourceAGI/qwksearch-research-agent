/**
 * Autocomplete Search Engine Backends — Provides query-completion suggestions
 * by querying the native autocomplete APIs of eight major search engines: Baidu,
 * Brave, DuckDuckGo, Google, Qwant, Startpage, Wikipedia, and Yandex. Each
 * backend normalises locale codes to the format expected by its API and returns
 * a plain string array. `searchAutocompleteMulti` fans out to multiple backends
 * in parallel and merges the deduplicated results.
 */

import grab from "grab-url";
import { parseHTML } from "linkedom";

type AutocompleteFunction = (query: string, locale?: string) => Promise<string[]>;

async function getSuggestions(url: string, options: any = {}): Promise<any> {
  try {
    const response = await grab(url, {
      timeout: 3,
      responseType: options.responseType || "json",
      ...options,
    });

    if (typeof response === "object" && "data" in response) return response.data;
    return response;
  } catch (error) {
    console.error("Autocomplete error:", error);
    return null;
  }
}

/**
 * Baidu autocomplete — returns suggestions from Baidu's `sugrec` endpoint.
 */
export async function baidu(query: string, _locale?: string): Promise<string[]> {
  const params = new URLSearchParams({ ie: "utf-8", json: "1", prod: "pc", wd: query });
  const data = await getSuggestions(`https://www.baidu.com/sugrec?${params}`);
  const results: string[] = [];
  if (data && data.g) for (const item of data.g) results.push(item.q);
  return results;
}

/**
 * Brave autocomplete — returns suggestions from Brave Search's suggest API.
 */
export async function brave(query: string, _locale?: string): Promise<string[]> {
  const params = new URLSearchParams({ q: query });
  const data = await getSuggestions(`https://search.brave.com/api/suggest?${params}`, {
    headers: { Cookie: "country=all" },
  });
  if (data && Array.isArray(data) && data.length > 1) return data[1];
  return [];
}

/**
 * DuckDuckGo autocomplete — maps `locale` (e.g. `en-US`) to a `kl` region code.
 */
export async function duckduckgo(query: string, locale: string = "en-US"): Promise<string[]> {
  const region = locale.toLowerCase().split("-").reverse().join("-");
  const params = new URLSearchParams({ q: query, kl: region });
  const data = await getSuggestions(`https://duckduckgo.com/ac/?type=list&${params}`);
  if (data && Array.isArray(data) && data.length > 1) return data[1];
  return [];
}

/**
 * Google autocomplete — routes to the locale-appropriate Google subdomain and
 * strips HTML entities from suggestion text using linkedom.
 */
export async function google(query: string, locale: string = "en"): Promise<string[]> {
  const subdomainMap: { [key: string]: string } = {
    de: "google.de", fr: "google.fr", es: "google.es", it: "google.it",
    nl: "google.nl", pt: "google.pt", ru: "google.ru",
    ja: "google.co.jp", zh: "google.com.hk", ko: "google.co.kr",
  };

  const lang = locale.split("-")[0];
  const subdomain = subdomainMap[lang] || "google.com";
  const params = new URLSearchParams({ q: query, client: "gws-wiz", hl: lang });
  const response = await getSuggestions(
    `https://${subdomain}/complete/search?${params}`,
    { responseType: "text" },
  );

  const results: string[] = [];
  if (response) {
    try {
      const jsonStart = response.indexOf("[");
      const jsonEnd = response.lastIndexOf("]") + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const data = JSON.parse(response.substring(jsonStart, jsonEnd));
        if (data[0]) {
          for (const item of data[0]) {
            const { document } = parseHTML(item[0]);
            const text = document.body?.textContent?.trim();
            if (text) results.push(text);
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return results;
}

/**
 * Qwant autocomplete — uses Qwant's v3 suggest API with locale normalisation.
 */
export async function qwant(query: string, locale: string = "en_US"): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    locale: locale.replace("-", "_"),
    version: "2",
  });
  const data = await getSuggestions(`https://api.qwant.com/v3/suggest?${params}`);
  const results: string[] = [];
  if (data && data.status === "success" && data.data?.items)
    for (const item of data.data.items) results.push(item.value);
  return results;
}

/**
 * Startpage autocomplete — maps locale to the `lui` language parameter.
 */
export async function startpage(query: string, locale: string = "en"): Promise<string[]> {
  const langMap: { [key: string]: string } = {
    da: "dansk", de: "deutsch", en: "english", es: "espanol",
    fr: "francais", nb: "norsk", nl: "nederlands",
    pl: "polski", pt: "portugues", sv: "svenska",
  };

  const lui = langMap[locale.split("-")[0]] || "english";
  const params = new URLSearchParams({
    q: query, format: "opensearch", segment: "startpage.defaultffx", lui,
  });

  const data = await getSuggestions(`https://www.startpage.com/suggestions?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });

  if (data && Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) return data[1];
  return [];
}

/**
 * Wikipedia autocomplete — uses the OpenSearch API on the locale-appropriate Wikipedia subdomain.
 */
export async function wikipedia(query: string, locale: string = "en"): Promise<string[]> {
  const langMap: { [key: string]: string } = {
    en: "en.wikipedia.org", de: "de.wikipedia.org", fr: "fr.wikipedia.org",
    es: "es.wikipedia.org", it: "it.wikipedia.org", nl: "nl.wikipedia.org",
    pt: "pt.wikipedia.org", ru: "ru.wikipedia.org", ja: "ja.wikipedia.org",
    zh: "zh.wikipedia.org", ar: "ar.wikipedia.org", ko: "ko.wikipedia.org",
  };

  const netloc = langMap[locale.split("-")[0]] || "en.wikipedia.org";
  const params = new URLSearchParams({
    action: "opensearch", format: "json", formatversion: "2",
    search: query, namespace: "0", limit: "10",
  });

  const data = await getSuggestions(`https://${netloc}/w/api.php?${params}`);
  if (data && Array.isArray(data) && data.length > 1) return data[1];
  return [];
}

/**
 * Yandex autocomplete — uses Yandex's `suggest-ff.cgi` endpoint.
 */
export async function yandex(query: string, _locale?: string): Promise<string[]> {
  const params = new URLSearchParams({ part: query });
  const data = await getSuggestions(
    `https://suggest.yandex.com/suggest-ff.cgi?${params}`,
  );
  if (data && Array.isArray(data) && data.length > 1) return data[1];
  return [];
}

/** Map of all available autocomplete backend names to their functions. */
export const backends: { [key: string]: AutocompleteFunction } = {
  baidu, brave, duckduckgo, google, qwant, startpage, wikipedia, yandex,
};

/**
 * Get autocomplete suggestions from a specific backend.
 *
 * @param backendName - Name of the backend (e.g. `"google"`, `"duckduckgo"`).
 * @param query - Partial search query to complete.
 * @param locale - BCP-47 locale code such as `"en-US"` or `"de-DE"`.
 */
export async function searchAutocomplete(
  backendName: string,
  query: string,
  locale: string = "en-US",
): Promise<string[]> {
  const backend = backends[backendName];
  if (!backend) {
    console.warn(`Autocomplete backend '${backendName}' not found`);
    return [];
  }
  try {
    return await backend(query, locale);
  } catch (error) {
    console.error(`Autocomplete error for ${backendName}:`, error);
    return [];
  }
}

/**
 * Fan out to multiple autocomplete backends in parallel and return a
 * deduplicated union of all suggestions.
 *
 * @param backendNames - Array of backend names to query.
 * @param query - Partial search query.
 * @param locale - BCP-47 locale code.
 */
export async function searchAutocompleteMulti(
  backendNames: string[],
  query: string,
  locale: string = "en-US",
): Promise<string[]> {
  const results = await Promise.all(
    backendNames.map((name) => searchAutocomplete(name, query, locale)),
  );

  const merged = new Set<string>();
  for (const result of results) for (const suggestion of result) merged.add(suggestion);

  return Array.from(merged);
}

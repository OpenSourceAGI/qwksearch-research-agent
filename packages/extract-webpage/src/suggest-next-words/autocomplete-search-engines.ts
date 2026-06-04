/**
 * Provides search query autocomplete/suggestions from various search engines.
 */

import grab from "grab-url";
import { parseHTML } from "linkedom";

/**
 * Autocomplete function type
 */
type AutocompleteFunction = (
  query: string,
  locale?: string,
) => Promise<string[]>;

/**
 * Get autocomplete suggestions with error handling
 */
async function getSuggestions(url: string, options: any = {}): Promise<any> {
  try {
    const response = await grab(url, {
      timeout: 3,
      responseType: options.responseType || "json",
      ...options,
    });

    if (typeof response === "object" && "data" in response) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error("Autocomplete error:", error);
    return null;
  }
}

/**
 * Baidu autocomplete
 */
export async function baidu(
  query: string,
  _locale?: string,
): Promise<string[]> {
  const params = new URLSearchParams({
    ie: "utf-8",
    json: "1",
    prod: "pc",
    wd: query,
  });

  const url = `https://www.baidu.com/sugrec?${params.toString()}`;
  const data = await getSuggestions(url);
  const results: string[] = [];

  if (data && data.g) {
    for (const item of data.g) {
      results.push(item.q);
    }
  }

  return results;
}

/**
 * Brave autocomplete
 */
export async function brave(
  query: string,
  _locale?: string,
): Promise<string[]> {
  const params = new URLSearchParams({ q: query });
  const url = `https://search.brave.com/api/suggest?${params.toString()}`;

  const data = await getSuggestions(url, {
    headers: {
      Cookie: "country=all",
    },
  });

  if (data && Array.isArray(data) && data.length > 1) {
    return data[1];
  }

  return [];
}

/**
 * DuckDuckGo autocomplete
 */
export async function duckduckgo(
  query: string,
  locale: string = "en-US",
): Promise<string[]> {
  // Extract region code (e.g., 'us-en' from 'en-US')
  const region = locale.toLowerCase().split("-").reverse().join("-");

  const params = new URLSearchParams({
    q: query,
    kl: region,
  });

  const url = `https://duckduckgo.com/ac/?type=list&${params.toString()}`;
  const data = await getSuggestions(url);

  if (data && Array.isArray(data) && data.length > 1) {
    return data[1];
  }

  return [];
}

/**
 * Google autocomplete
 */
export async function google(
  query: string,
  locale: string = "en",
): Promise<string[]> {
  // Map locale to Google subdomain
  const subdomainMap: { [key: string]: string } = {
    de: "google.de",
    fr: "google.fr",
    es: "google.es",
    it: "google.it",
    nl: "google.nl",
    pt: "google.pt",
    ru: "google.ru",
    ja: "google.co.jp",
    zh: "google.com.hk",
    ko: "google.co.kr",
  };

  const lang = locale.split("-")[0];
  const subdomain = subdomainMap[lang] || "google.com";

  const params = new URLSearchParams({
    q: query,
    client: "gws-wiz",
    hl: lang,
  });

  const url = `https://${subdomain}/complete/search?${params.toString()}`;
  const response = await getSuggestions(url, { responseType: "text" });

  const results: string[] = [];

  if (response) {
    try {
      // Extract JSON from response
      const jsonStart = response.indexOf("[");
      const jsonEnd = response.lastIndexOf("]") + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonText = response.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonText);

        if (data[0]) {
          for (const item of data[0]) {
            // Parse HTML entities
            const { document } = parseHTML(item[0]);
            const text = document.body?.textContent?.trim();
            if (text) {
              results.push(text);
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return results;
}

/**
 * Qwant autocomplete
 */
export async function qwant(
  query: string,
  locale: string = "en_US",
): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    locale: locale.replace("-", "_"),
    version: "2",
  });

  const url = `https://api.qwant.com/v3/suggest?${params.toString()}`;
  const data = await getSuggestions(url);
  const results: string[] = [];

  if (data && data.status === "success" && data.data && data.data.items) {
    for (const item of data.data.items) {
      results.push(item.value);
    }
  }

  return results;
}

/**
 * Startpage autocomplete
 */
export async function startpage(
  query: string,
  locale: string = "en",
): Promise<string[]> {
  const langMap: { [key: string]: string } = {
    da: "dansk",
    de: "deutsch",
    en: "english",
    es: "espanol",
    fr: "francais",
    nb: "norsk",
    nl: "nederlands",
    pl: "polski",
    pt: "portugues",
    sv: "svenska",
  };

  const baseLang = locale.split("-")[0];
  const lui = langMap[baseLang] || "english";

  const params = new URLSearchParams({
    q: query,
    format: "opensearch",
    segment: "startpage.defaultffx",
    lui: lui,
  });

  const url = `https://www.startpage.com/suggestions?${params.toString()}`;
  const data = await getSuggestions(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (
    data &&
    Array.isArray(data) &&
    data.length >= 2 &&
    Array.isArray(data[1])
  ) {
    return data[1];
  }

  return [];
}

/**
 * Wikipedia autocomplete
 */
export async function wikipedia(
  query: string,
  locale: string = "en",
): Promise<string[]> {
  const langMap: { [key: string]: string } = {
    en: "en.wikipedia.org",
    de: "de.wikipedia.org",
    fr: "fr.wikipedia.org",
    es: "es.wikipedia.org",
    it: "it.wikipedia.org",
    nl: "nl.wikipedia.org",
    pt: "pt.wikipedia.org",
    ru: "ru.wikipedia.org",
    ja: "ja.wikipedia.org",
    zh: "zh.wikipedia.org",
    ar: "ar.wikipedia.org",
    ko: "ko.wikipedia.org",
  };

  const lang = locale.split("-")[0];
  const netloc = langMap[lang] || "en.wikipedia.org";

  const params = new URLSearchParams({
    action: "opensearch",
    format: "json",
    formatversion: "2",
    search: query,
    namespace: "0",
    limit: "10",
  });

  const url = `https://${netloc}/w/api.php?${params.toString()}`;
  const data = await getSuggestions(url);

  if (data && Array.isArray(data) && data.length > 1) {
    return data[1];
  }

  return [];
}

/**
 * Yandex autocomplete
 */
export async function yandex(
  query: string,
  _locale?: string,
): Promise<string[]> {
  const params = new URLSearchParams({ part: query });
  const url = `https://suggest.yandex.com/suggest-ff.cgi?${params.toString()}`;

  const data = await getSuggestions(url);

  if (data && Array.isArray(data) && data.length > 1) {
    return data[1];
  }

  return [];
}

/**
 * Available autocomplete backends
 */
export const backends: { [key: string]: AutocompleteFunction } = {
  baidu,
  brave,
  duckduckgo,
  google,
  qwant,
  startpage,
  wikipedia,
  yandex,
};

/**
 * Get autocomplete suggestions from a specific backend
 *
 * @param backendName - Name of the autocomplete backend
 * @param query - Search query
 * @param locale - Locale/language code (e.g., 'en-US', 'de-DE')
 * @returns Array of suggestion strings
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
 * Get autocomplete suggestions from multiple backends and merge them
 *
 * @param backendNames - Array of backend names to query
 * @param query - Search query
 * @param locale - Locale/language code
 * @returns Merged and deduplicated array of suggestions
 */
export async function searchAutocompleteMulti(
  backendNames: string[],
  query: string,
  locale: string = "en-US",
): Promise<string[]> {
  const promises = backendNames.map((name) =>
    searchAutocomplete(name, query, locale),
  );
  const results = await Promise.all(promises);

  // Merge and deduplicate
  const merged = new Set<string>();
  for (const result of results) {
    for (const suggestion of result) {
      merged.add(suggestion);
    }
  }

  return Array.from(merged);
}

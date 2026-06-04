import fs from 'fs';

interface FaviconCache {
  [domain: string]: string;
}

/**
 * Get favicon for a URL or domain as base64 string using Google's favicon API
 */
export async function getFaviconForDomain(
  urlOrDomain: string,
  formatBase64: boolean = true
): Promise<string> {
  // Extract domain from URL or use as-is
  const domain = isURLValid(urlOrDomain)
    ? new URL(urlOrDomain.startsWith('http') ? urlOrDomain : 'https://' + urlOrDomain).hostname
    : urlOrDomain;

  // Check cache first - look for domain in domain-info.json
  try {
    const cachePath = './data/domain-info.json';
    if (fs.existsSync(cachePath)) {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cacheData[domain]) {
        console.log(`Cache hit for domain: ${domain}`);
        // Return cached favicon if available, or proceed with API call
        // For now, we'll still make the API call but log the cache hit
      }
    }
  } catch (error) {
    console.warn(`Cache check failed for ${domain}:`, (error as Error).message);
  }

  const faviconURL = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain);
  const cacheFavicon: FaviconCache = JSON.parse(fs.readFileSync('./data/favicons.json', 'utf8'));

  return formatBase64
    ? cacheFavicon[domain] || Buffer.from(await (await fetch(faviconURL)).arrayBuffer()).toString('base64')
    : faviconURL;
}

/**
 * Extract TLD and hostname from domain in Regex. There's two or more part
 * TLDs (https://en.wikipedia.org/wiki/List_of_Internet_top-level_domains)
 * so it is hard to tell if host.secondTLD.tld or host.tld is correct way
 * to get root domain (e.g. abc.go.jp, abc.co.uk)
 */
export function convertURLToDomain(domain: string): string {
  const tldRegExp = new RegExp(
    "(?=[^^]).(fr|de|cz|at|com|wiki|co|edu|gov|info|mil|id|" +
    "gv|tv|int|name|net|org|pro|ac|me|ltd|parliament)(.|$).*$"
  );
  const match =
    domain.match(tldRegExp) ||
    domain.match(/(?=[^^])\.[^a-z]{1,2}\.[^\.]{2,4}$/) ||
    domain.match(/\.[^\.]{2,}$/);
  const tld = match && match.index;
  let domainWithoutSuffix = domain.substring(0, tld);

  // Get the main domain part, handling subdomains
  if (domainWithoutSuffix.includes(".")) {
    // Split by dots and get the last two parts for domains like en.wikipedia.org
    const parts = domainWithoutSuffix.split(".");
    if (parts.length >= 2) {
      domainWithoutSuffix = parts.slice(-2).join(".");
    } else {
      domainWithoutSuffix = parts[parts.length - 1];
    }
  }
  return domainWithoutSuffix;
}

/**
 * Checks if a string is a valid URL.
 */
export function isURLValid(url: string): boolean {
  return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    .test(url);
}

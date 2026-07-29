/**
 * @fileoverview CLI script that merges the general domain-info list with the
 * curated news-domain-rank list into a single compact ranked dataset.
 *
 * News entries override general entries for shared domains; news-only
 * domains are appended with sequentially assigned ranks. Writes the result
 * as trailing-value-trimmed arrays to `domain-rank-merged.json`. Runs
 * `mergeDomainLists()` when executed directly.
 */
import fs from "fs";

type OldDomainEntry = [number, string]; // [rank, title] (existing source format)

type OutputEntry = {
  name?: string; // preferred display name (news title overrides)
  domainRank?: number;
  domainTitle?: string;
  newsRank?: number;
  newsTitle?: string;
  langCode?: string;
};

type DomainMap = Record<string, OutputEntry>;

/**
 * Merge domain-info.json (general 1M list) with news-domain-rank.json
 * (curated news sources). News entries override general entries for the same
 * domain; news-only domains are appended after the general list.
 *
 * Ranks are reassigned sequentially in the merged output.
 */
export function mergeDomainLists(options: {
  domainInfoPath?: string;
  newsDomainRankPath?: string;
  outputPath?: string;
} = {}): DomainMap {
  const {
    domainInfoPath = "./data/domain-info.json",
    newsDomainRankPath = "./data/news-domain-rank.json",
    outputPath = "./data/domain-rank-merged.json",
  } = options;

  const domainInfoRaw: Record<string, OldDomainEntry> = fs.existsSync(domainInfoPath)
    ? JSON.parse(fs.readFileSync(domainInfoPath, "utf8"))
    : {};

  const newsDomainRaw: Record<string, OldDomainEntry> = fs.existsSync(newsDomainRankPath)
    ? JSON.parse(fs.readFileSync(newsDomainRankPath, "utf8"))
    : {};

  // Build merged map preserving both domain and news information
  const merged: DomainMap = {};

  // copy general list first
  for (const [domain, entry] of Object.entries(domainInfoRaw)) {
    const [rank, title] = entry || [undefined, undefined];
    const newsEntry = newsDomainRaw[domain];
    const newsRank = newsEntry ? newsEntry[0] : undefined;
    const newsTitle = newsEntry ? newsEntry[1] : undefined;
    const name = newsTitle || title || domain;
    merged[domain] = {
      name,
      domainRank: typeof rank === 'number' ? rank : undefined,
      domainTitle: title || undefined,
      newsRank: typeof newsRank === 'number' ? newsRank : undefined,
      newsTitle: newsTitle || undefined,
      langCode: undefined,
    };
  }

  // Determine next rank for news-only domains
  const maxDomainRank = Object.values(merged).reduce((max, e) => Math.max(max, e.domainRank || 0), 0);
  let nextRank = maxDomainRank + 1;

  // append news-only domains
  for (const [domain, entry] of Object.entries(newsDomainRaw)) {
    if (merged[domain]) continue;
    const [newsRank, newsTitle] = entry || [undefined, undefined];
    merged[domain] = {
      name: newsTitle || domain,
      domainRank: nextRank++,
      newsRank: typeof newsRank === 'number' ? newsRank : undefined,
      newsTitle: newsTitle || undefined,
      langCode: undefined,
    };
  }

  // Prepare serializable output as variable-length arrays:
  // [name, domainRank, domainTitle, newsRank, newsTitle, langCode]
  // Trailing blank/null/zero values are omitted to keep output compact.
  const outputObj: Record<string, Array<string | number>> = {};
  for (const [domain, entry] of Object.entries(merged)) {
    const domainTitleField = entry.domainTitle !== undefined && entry.domainTitle !== entry.name ? entry.domainTitle : "";
    const newsTitleField = entry.newsTitle !== undefined && entry.newsTitle !== entry.name ? entry.newsTitle : "";

    const full: Array<string | number> = [
      entry.name ?? "",
      entry.domainRank ?? 0,
      domainTitleField,
      entry.newsRank ?? 0,
      newsTitleField,
      entry.langCode ?? "",
    ];

    let len = full.length;
    while (len > 0 && !full[len - 1]) len--;
    outputObj[domain] = full.slice(0, len);
  }

  fs.writeFileSync(outputPath, JSON.stringify(outputObj), "utf8");
  console.log(
    `Merged ${Object.keys(domainInfoRaw).length} general + ${Object.keys(newsDomainRaw).length} news entries → ${Object.keys(merged).length} total → ${outputPath}`
  );

  return merged;
}

// Run when called directly: bun src/merge-domain-lists.ts
mergeDomainLists();

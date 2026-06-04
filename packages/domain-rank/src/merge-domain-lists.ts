import fs from "fs";

type OldDomainEntry = [number, string]; // [rank, title] (existing source format)
type DomainEntry = [string, number | null, number | null, string | null]; // [realName, domainRank, newsRank, langCode]
type DomainMap = Record<string, DomainEntry>;

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

  // Build merged map with new shape: [realName, domainRank, newsRank, langCode]
  const merged: DomainMap = {};

  // copy general list first
  for (const [domain, entry] of Object.entries(domainInfoRaw)) {
    const [rank, title] = entry || [null, null];
    const newsEntry = newsDomainRaw[domain];
    const newsRank = newsEntry ? newsEntry[0] : null;
    const newsTitle = newsEntry ? newsEntry[1] : null;
    const realName = newsTitle || title || domain;
    merged[domain] = [realName, typeof rank === 'number' ? rank : null, typeof newsRank === 'number' ? newsRank : null, null];
  }

  // Determine next rank for news-only domains
  const maxDomainRank = Object.values(merged).reduce((max, [_name, domainRank]) => Math.max(max, domainRank || 0), 0);
  let nextRank = maxDomainRank + 1;

  // append news-only domains
  for (const [domain, entry] of Object.entries(newsDomainRaw)) {
    if (merged[domain]) continue;
    const [newsRank, newsTitle] = entry || [null, null];
    merged[domain] = [newsTitle || domain, nextRank++, typeof newsRank === 'number' ? newsRank : null, null];
  }

  fs.writeFileSync(outputPath, JSON.stringify(merged), "utf8");
  console.log(
    `Merged ${Object.keys(domainInfoRaw).length} general + ${Object.keys(newsDomainRaw).length} news entries → ${Object.keys(merged).length} total → ${outputPath}`
  );

  return merged;
}

// Run when called directly: bun src/merge-domain-lists.ts
mergeDomainLists();

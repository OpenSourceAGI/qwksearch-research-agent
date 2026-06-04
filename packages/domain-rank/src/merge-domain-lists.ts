import fs from "fs";

type DomainEntry = [number, string]; // [rank, title]
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

  const domainInfo: DomainMap = fs.existsSync(domainInfoPath)
    ? JSON.parse(fs.readFileSync(domainInfoPath, "utf8"))
    : {};

  const newsDomainRank: DomainMap = fs.existsSync(newsDomainRankPath)
    ? JSON.parse(fs.readFileSync(newsDomainRankPath, "utf8"))
    : {};

  // Start with the general list, overriding titles with curated news titles
  const merged: DomainMap = {};

  for (const [domain, [rank, title]] of Object.entries(domainInfo)) {
    const newsEntry = newsDomainRank[domain];
    merged[domain] = newsEntry ? [rank, newsEntry[1]] : [rank, title];
  }

  // Append news-only domains not already in the general list
  const maxRank = Object.values(merged).reduce(
    (max, [rank]) => Math.max(max, rank),
    0
  );
  let nextRank = maxRank + 1;

  for (const [domain, [, title]] of Object.entries(newsDomainRank)) {
    if (!merged[domain]) {
      merged[domain] = [nextRank++, title];
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(merged), "utf8");
  console.log(
    `Merged ${Object.keys(domainInfo).length} general + ${Object.keys(newsDomainRank).length} news entries → ${Object.keys(merged).length} total → ${outputPath}`
  );

  return merged;
}

// Run when called directly: bun src/merge-domain-lists.ts
mergeDomainLists();

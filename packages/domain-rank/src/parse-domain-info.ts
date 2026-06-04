import domainsOfficial from "../data/domains-official-1m.js";
import fs from "fs";
import {
  shouldRemoveDomain,
  findMainDomain,
  getTitleOverride,
  formatDomainAsTitle,
  cleanSourceTitle,
  getSourceTitle,
} from "./domain-name-formatter.js";

type DomainMap = Record<string, [number, string]>;

interface DomainInfoOptions {
  startIndex?: number;
  endIndex?: number;
  resume?: boolean;
}

export async function domainInfo(options: DomainInfoOptions = {}): Promise<void> {
  const { startIndex = 0, endIndex = 1000, resume = false } = options;

  const domainsArray = domainsOfficial.split(",");
  const actualEndIndex = Math.min(endIndex, domainsArray.length);
  const dataPath = "./data/domain-info.json";

  let domainResults: DomainMap = {};
  let resumeFromIndex = startIndex;

  if (fs.existsSync(dataPath)) {
    domainResults = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    if (resume) {
      const existing = Object.keys(domainResults);
      if (existing.length > 0) {
        const lastDomain = existing[existing.length - 1];
        const lastIndex = domainsArray.indexOf(lastDomain);
        if (lastIndex !== -1) {
          resumeFromIndex = lastIndex + 1;
          console.log(`Resuming from domain: ${lastDomain} (index ${resumeFromIndex})`);
        }
      }
    }
  } else {
    fs.writeFileSync(dataPath, "{}", "utf8");
  }

  if (!resume && startIndex === 0) {
    domainResults = {};
    fs.writeFileSync(dataPath, "{}", "utf8");
  }

  console.log(`Processing domains from index ${resumeFromIndex} to ${actualEndIndex - 1}`);

  let actualRank = Object.keys(domainResults).length;

  for (let i = resumeFromIndex; i < actualEndIndex; i++) {
    const domain = domainsArray[i];

    if (shouldRemoveDomain(domain)) {
      console.log(`Skipping ${i + 1}: ${domain} (marked for removal)`);
      continue;
    }

    const mainDomain = findMainDomain(domain);
    if (mainDomain) {
      console.log(`Skipping ${i + 1}: ${domain} (alternative for ${mainDomain})`);
      continue;
    }

    actualRank++;
    console.log(`Processing ${actualRank}: ${domain}`);

    let source: string | null = getTitleOverride(domain);

    if (!source) {
      source = formatDomainAsTitle(domain);
    }

    if (!getTitleOverride(domain)) {
      const webTitle = await getSourceTitle(domain);
      if (webTitle) {
        const cleaned = cleanSourceTitle(webTitle)
          ?.replace(/homepage/gi, "")
          .replace(/home/gi, "")
          .replace(".com", "");
        if (cleaned && cleaned.length > 0) {
          const wordCount = cleaned.split(/\s+/).filter((w) => w.length > 0).length;
          if (wordCount < 3) source = cleaned;
        }
      }
    }

    domainResults[domain] = [actualRank, source || domain];
    fs.writeFileSync(dataPath, JSON.stringify(domainResults), "utf8");
  }
}

domainInfo({ startIndex: 0, endIndex: 1000000, resume: true });

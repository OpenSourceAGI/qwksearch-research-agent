import fs from "fs";
import zlib from "zlib";
import readline from "readline";
import { writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Transform, Readable } from 'stream';
import unzipper from 'unzipper';
import grab from "grab-url";




/**
 * Domain Rank shows how trustworthy and influential a domain is based on links pointing to that
 *  domain's pages across all 120+ million domains.
 *
 * @see [CommonCrawl](https://commoncrawl.org/web-graphs)
 * CommonCrawl is a nonprofit for open source public dataset that crawls and downloads the entire
 *  internet 100TB urls and html. CommonCrawl calculates domain rank for 100M domains, using
 *  PageRank algorithm which randomly surfs links and counts travels to each page to find 
 * probability of being at a domain, thus ranking influence among other reputable domains.
 */
export async function importDomainsPageRankCrawler(urlCommonCrawl = '', limit = 1000000) {
  const url = urlCommonCrawl || await getDomainCrawlerUrl();

  try {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    try { fs.unlinkSync("./data/domains-1m.js"); } catch (_) {}

    const writeStream = fs.createWriteStream("./data/domains-1m.js", { flags: "w" });
    let lineNum = 0;
    let headerProcessed = false;
    writeStream.write("export default '");

    const ticker = setInterval(() => {
      console.log(`Processed lines: ${lineNum.toLocaleString()}`);
      if (lineNum >= limit) clearInterval(ticker);
    }, 5000);

    await grab(url, {
      onStream: async (body) => {
        const decompressedStream = Readable.fromWeb(body).pipe(zlib.createGunzip());
        const rl = readline.createInterface({ input: decompressedStream, crlfDelay: Infinity });
        let streamClosed = false;

        function closeStream() {
          if (!streamClosed) {
            streamClosed = true;
            writeStream.write('\b');
            writeStream.write("'");
            writeStream.end();
            clearInterval(ticker);
            console.log(`Output file: ./data/domains-1m.js`);
          }
        }

        rl.on('line', (line) => {
          try {
            if (streamClosed) return;
            if (!headerProcessed) {
              if (line.includes("#host_rev")) { headerProcessed = true; return; }
            }
            const parts = line.split("\t");
            if (parts.length < 5) return;
            const domain = parts[4];
            if (!domain || domain === "#host_rev") return;
            writeStream.write(`${domain.split(".").reverse().join(".")},`);
            lineNum++;
            if (lineNum >= limit) { rl.close(); closeStream(); }
          } catch (error) {
            console.error("Error processing line:", error);
          }
        });

        await new Promise((resolve, reject) => {
          rl.on('close', () => { closeStream(); resolve(); });
          rl.on('error', (err) => { clearInterval(ticker); reject(err); });
        });
      }
    });

  } catch (error) {
    console.error("Error:", error);
  }
}


/**
 * Scrapes Common Crawl web graphs page to find the domain-ranks.txt.gz URL
 * from the first available date listing.
 * 
 * @returns {Promise<string>} The full URL to the domain-ranks.txt.gz file
 * @throws {Error} When HTTP requests fail, date links are not found, or domain-ranks.txt.gz is not found
 */
export async function getDomainCrawlerUrl() {
  const mainHtml = await grab('https://commoncrawl.org/web-graphs', { timeout: 10 });

  const datePattern = /href="([^"]*\d{4}-\w+[^"]*)"/;
  const dateMatch = mainHtml.match(datePattern);
  if (!dateMatch) throw new Error('No date link found');

  const dateUrl = dateMatch[1].startsWith('http')
    ? dateMatch[1]
    : `https://commoncrawl.org${dateMatch[1]}`;

  const dateHtml = await grab(dateUrl, { timeout: 10 });

  const rankPattern = /href="([^"]*domain-ranks\.txt\.gz[^"]*)"/;
  const rankMatch = dateHtml.match(rankPattern);
  if (!rankMatch) throw new Error('domain-ranks.txt.gz not found');

  return rankMatch[1].startsWith('http')
    ? rankMatch[1]
    : `https://commoncrawl.org${rankMatch[1]}`;
}



/**
 * Download and extract the current Tranco top-1M domain ranking.
 *
 * The Tranco project aggregates multiple ranking providers (Cisco Umbrella,
 * Majestic, Farsight, Chrome UX Report, Cloudflare Radar) to generate
 * manipulation-resistant popularity lists. The list is updated daily (UTC).
 *
 * Source: https://tranco-list.eu/
 * Default dataset: https://tranco-list.eu/top-1m.csv.zip
 */

async function importDomainsOfficialList(limit = 10000) {
  const url = 'https://tranco-list.eu/top-1m.csv.zip';
  const output = './data/domains-official-100k.js';

  console.log(`Streaming download and extraction (limit: ${limit.toLocaleString()})...`);

  const domains = [];
  let isFirstLine = true;
  let done = false;

  await grab(url, {
    onStream: (body) => pipeline(
      Readable.fromWeb(body),
      unzipper.ParseOne(),
      new Transform({
        objectMode: false,
        transform(chunk, encoding, callback) {
          if (done) return callback();
          for (const line of chunk.toString().split('\n')) {
            if (isFirstLine) { isFirstLine = false; continue; }
            const domain = line.split(',')[1]?.replace(/"/g, '').trim();
            if (domain) domains.push(domain);
            if (domains.length >= limit) { done = true; break; }
          }
          callback();
        }
      })
    )
  });

  await writeFile(output, `export default '${domains.join(',')}';`);
  console.log(`Saved ${domains.length} domains to ${output}`);
}



//if run directly
if (import.meta.main) {
  // importDomainsPageRankCrawler();
  importDomainsOfficialList(10000);
}
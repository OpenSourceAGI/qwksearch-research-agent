import { Database } from "bun:sqlite";
import domains from "../data/domains-1m.js";

const db = new Database("favicons.sqlite");

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS favicons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE,
    favicon BLOB,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Get favicon for a single domain using Google's favicon API
 * @param {string} domain - Domain name to fetch favicon for
 * @param {number} [size=16] - Size of the favicon in pixels
 * @returns {Promise<Buffer|null>} Buffer containing favicon data or null if failed
 */
async function getFaviconForSingleDomain(domain, size = 16) {
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=' + size,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Check if we got a valid image (not the default Google favicon)
    if (buffer.length < 100) {
      return null; // Too small, likely a default favicon
    }

    return buffer;
  } catch (error) {
    console.log(`Could not fetch favicon for ${domain}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch favicons and store them in SQLite database
 * @param {object} options - Options for fetching favicons
 * @param {number} options.startIndex - Start index in domains list (default: 0)
 * @param {number} options.endIndex - End index in domains list (default: 1000)
 * @param {number} options.size - Size of favicons in pixels (default: 16)
 * @param {number} options.delay - Delay between requests in ms (default: 200)
 * @returns {Promise<void>} Promise that resolves when all favicons are fetched and stored
 */
async function fetchAndStoreFavicons(options = {}) {
  const {
    startIndex = 0,
    endIndex = 1000,
    size = 16,
    delay = 200,
  } = options;

  const domainsArray = domains.split(",");
  const actualEndIndex = Math.min(endIndex, domainsArray.length);

  // Prepare statements for better performance
  const insertStmt = db.prepare(
    "INSERT OR REPLACE INTO favicons (domain, favicon, size) VALUES (?, ?, ?)"
  );
  const existsStmt = db.prepare(
    "SELECT id FROM favicons WHERE domain = ? AND size = ?"
  );

  // Get current count
  const initialCount = db.query("SELECT COUNT(*) as count FROM favicons").get().count;
  console.log(`Starting with ${initialCount} favicons in database`);
  console.log(`Fetching favicons for domains ${startIndex} to ${actualEndIndex - 1}`);
  console.log(`Target: ${actualEndIndex - startIndex} domains`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = startIndex; i < actualEndIndex; i++) {
    const domain = domainsArray[i];
    
    // Check if already exists with same size
    const exists = existsStmt.get(domain, size);
    if (exists) {
      console.log(`Skipping ${i + 1}: ${domain} (already exists)`);
      skipCount++;
      continue;
    }

    console.log(`Fetching ${i + 1}: ${domain}`);
    
    const faviconBuffer = await getFaviconForSingleDomain(domain, size);
    
    if (faviconBuffer) {
      insertStmt.run(domain, faviconBuffer, size);
      successCount++;
      console.log(`✓ Stored favicon for ${domain} (${faviconBuffer.length} bytes)`);
      
      // Log progress every 20 successful downloads
      if (successCount % 20 === 0) {
        const currentCount = db.query("SELECT COUNT(*) as count FROM favicons").get().count;
        console.log(`Progress: ${successCount} new favicons downloaded, ${currentCount} total in database`);
      }
    } else {
      failCount++;
      console.log(`✗ Failed to download favicon for ${domain}`);
    }

    // Add delay to avoid overwhelming Google's API
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const finalCount = db.query("SELECT COUNT(*) as count FROM favicons").get().count;
  
  console.log(`\nCompleted fetching favicons!`);
  console.log(`Total favicons in database: ${finalCount}`);
  console.log(`New favicons: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Failed: ${failCount}`);
}

/**
 * Get favicon from database by domain
 * @param {string} domain - Domain to get favicon for
 * @param {number} [size=16] - Size of favicon to retrieve
 * @returns {Buffer|null} Favicon buffer or null if not found
 */
function getFaviconFromDatabase(domain, size = 16) {
  const stmt = db.prepare("SELECT favicon FROM favicons WHERE domain = ? AND size = ?");
  const result = stmt.get(domain, size);
  return result ? result.favicon : null;
}

/**
 * Get all domains that have favicons stored
 * @param {number} [size=16] - Size filter
 * @returns {string[]} Array of domain names
 */
function getDomainsWithFavicons(size = 16) {
  const stmt = db.prepare("SELECT domain FROM favicons WHERE size = ? ORDER BY domain");
  return stmt.all(size).map(row => row.domain);
}

/**
 * Get database statistics
 * @returns {object} Statistics about the favicon database
 */
function getDatabaseStats() {
  const totalCount = db.query("SELECT COUNT(*) as count FROM favicons").get().count;
  const sizeStats = db.query(`
    SELECT size, COUNT(*) as count 
    FROM favicons 
    GROUP BY size 
    ORDER BY size
  `).all();
  
  const totalSize = db.query(`
    SELECT SUM(LENGTH(favicon)) as totalBytes 
    FROM favicons
  `).get().totalBytes || 0;

  return {
    totalFavicons: totalCount,
    totalSizeBytes: totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    sizeBreakdown: sizeStats
  };
}

// Export functions for use as a module
export {
  fetchAndStoreFavicons,
  getFaviconFromDatabase,
  getDomainsWithFavicons,
  getDatabaseStats,
  getFaviconForSingleDomain
};

// Close database connection gracefully on exit
process.on('SIGINT', () => {
  console.log('\nClosing database connection...');
  db.close();
  process.exit(0);
});

// Run for top 1000 domains if this file is executed directly
if (import.meta.main) {
  console.log('Starting favicon fetcher...');
  await fetchAndStoreFavicons({ startIndex: 0, endIndex: 1000, delay: 200 });
  console.log('\nDatabase stats:');
  console.log(getDatabaseStats());
}
/**
 * @module research/extractor/url-to-content/is-url-porn
 * @description Research library module.
 */
export interface IsURLPornOptions {
  url?: string;
  title?: string;
  threshold?: number;
}

/**
 * Determines if content is likely adult/porn based on configurable threshold
 *
 * @param {Object} options - Configuration object
 * @param {string} [options.url] - URL to analyze (optional)
 * @param {string} [options.title] - Page title to analyze (optional)
 * @param {number} [options.threshold] - Probability threshold (0.5 default)
 * @returns {boolean} True if likelihood exceeds threshold, false otherwise
 * @author [vtempest (2025)](https://github.com/vtempest)
 * @example
 * isURLPorn({
 *   title: "Hot deals on sexy cars",
 *   threshold: 0.8
 * });
 * console.log(isPorn2); // false (low confidence)
 */
export function isURLPorn(options: IsURLPornOptions = {}): boolean {
  if (!options || typeof options !== "object") {
    throw new Error("Options parameter must be an object");
  }

  const { url = "", title = "", threshold = 0.5 } = options;

  if (threshold < 0 || threshold > 1) {
    throw new Error("Threshold must be between 0 and 1");
  }

  if (!url && !title) {
    return false;
  }

  const likelihood = calculateLikelihood(url, title);
  return likelihood >= threshold;
}

/**
 * Configuration object containing patterns and keywords for adult content detection
 */
const ADULT_CONTENT_CONFIG = {
  keywords: [
    "adult",
    "adultvideo",
    "adultmovie",
    "adultfilm",
    "anal",
    "bdsm",
    "bestiality",
    "bondage",
    "boob",
    "boobs",
    "boobies",
    "breast",
    "bukkake",
    "cameltoe",
    "creampie",
    "cock",
    "cuckold",
    "cunt",
    "deepthroat",
    "erotic",
    "escort",
    "facesitting",
    "facial",
    "felching",
    "fetish",
    "fisting",
    "gloryhole",
    "gonzo",
    "hentai",
    "incest",
    "lesbian",
    "lolicon",
    "naked",
    "naughty",
    "nude",
    "orgasm",
    "orgy",
    "pegging",
    "penis",
    "playboy",
    "porn",
    "pornography",
    "pussy",
    "rimjob",
    "scat",
    "semen",
    "sperm",
    "sexvideo",
    "transsexual",
    "transgender",
    "threesome",
    "twink",
    "upskirt",
    "vagina",
    "virgin",
    "whore",
    "xxx",
    "yaoi",
    "yiff",
    "youporn",
  ],
  urlPatterns: [
    "porn",
    "xxx",
    "adult",
    "nude",
    "naked",
    "escort",
    "fetish",
    "tube",
    "redtube",
    "pornhub",
    "xnxx",
    "xhamster",
    "youporn",
    "xvideos",
    "spankbang",
    "eporner",
    "tnaflix",
  ],
  titlePhrases: [
    "free porn",
    "xxx videos",
    "adult videos",
    "sex videos",
    "nude pics",
    "naked girls",
    "hot babes",
    "sexy women",
    "porn tube",
    "adult tube",
    "sex tube",
    "xxx tube",
  ],
  strongIndicators: [
    "pornhub",
    "xnxx",
    "xhamster",
    "youporn",
    "xvideos",
    "redtube",
    "porn",
    "xxx",
    "adult",
    "nude",
    "naked",
    "sex",
  ],
};

/**
 * Calculates the likelihood (0-1) that content contains adult material
 *
 * @param {string} url - URL to analyze
 * @param {string} title - Title to analyze
 * @returns {number} Likelihood score between 0 and 1
 */
function calculateLikelihood(url: string, title: string): number {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const flags = "gi";

  // Analyze URL
  if (url && typeof url === "string") {
    const urlScore = analyzeUrl(url, flags);
    totalScore += urlScore.score;
    maxPossibleScore += urlScore.maxScore;
  }

  // Analyze title
  if (title && typeof title === "string") {
    const titleScore = analyzeTitle(title, flags);
    totalScore += titleScore.score;
    maxPossibleScore += titleScore.maxScore;
  }

  // Normalize score to 0-1 range
  if (maxPossibleScore === 0) {
    return 0;
  }

  const normalizedScore = Math.min(totalScore / maxPossibleScore, 1);

  // Apply sigmoid function to create more realistic probability distribution
  return applySigmoid(normalizedScore);
}

/**
 * Analyzes a URL for adult content indicators
 *
 * @param {string} url - URL to analyze
 * @param {string} flags - Regex flags
 * @returns {Object} Score object with score and maxScore properties
 */
function analyzeUrl(url: string, flags: string): { score: number; maxScore: number } {
  let score = 0;
  const maxScore = 100;

  try {
    // Parse URL components
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const searchParams = urlObj.search.toLowerCase();
    const fullUrl = url.toLowerCase();

    // Check for strong indicators in hostname (highest weight)
    ADULT_CONTENT_CONFIG.strongIndicators.forEach((indicator) => {
      if (hostname.includes(indicator)) {
        score += 30; // High confidence
      }
    });

    // Check URL patterns in all components
    ADULT_CONTENT_CONFIG.urlPatterns.forEach((pattern) => {
      const regex = new RegExp(pattern, flags);
      if (regex.test(hostname)) score += 20;
      if (regex.test(pathname)) score += 15;
      if (regex.test(searchParams)) score += 10;
    });

    // Check general keywords in full URL
    ADULT_CONTENT_CONFIG.keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, flags);
      if (regex.test(fullUrl)) {
        score += 5;
      }
    });
  } catch (error) {
    // If URL parsing fails, treat as plain text
    ADULT_CONTENT_CONFIG.urlPatterns.forEach((pattern) => {
      const regex = new RegExp(pattern, flags);
      if (regex.test(url)) {
        score += 15;
      }
    });

    ADULT_CONTENT_CONFIG.keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, flags);
      if (regex.test(url)) {
        score += 5;
      }
    });
  }

  return { score: Math.min(score, maxScore), maxScore };
}

/**
 * Analyzes a title for adult content indicators
 *
 * @param {string} title - Title to analyze
 * @param {string} flags - Regex flags
 * @returns {Object} Score object with score and maxScore properties
 */
function analyzeTitle(title: string, flags: string): { score: number; maxScore: number } {
  let score = 0;
  const maxScore = 100;

  // Check title-specific phrases (highest weight for titles)
  ADULT_CONTENT_CONFIG.titlePhrases.forEach((phrase) => {
    const regex = new RegExp(escapeRegex(phrase), flags);
    if (regex.test(title)) {
      score += 25;
    }
  });

  // Check strong indicators
  ADULT_CONTENT_CONFIG.strongIndicators.forEach((indicator) => {
    const regex = new RegExp(`\\b${escapeRegex(indicator)}\\b`, flags);
    if (regex.test(title)) {
      score += 20;
    }
  });

  // Check general keywords
  ADULT_CONTENT_CONFIG.keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, flags);
    if (regex.test(title)) {
      score += 8;
    }
  });

  return { score: Math.min(score, maxScore), maxScore };
}

/**
 * Escapes special regex characters in a string
 *
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Applies sigmoid function to normalize score to more realistic probability
 *
 * @param {number} x - Input value
 * @returns {number} Sigmoid output between 0 and 1
 */
function applySigmoid(x: number): number {
  // Adjust sigmoid steepness for more realistic distribution
  const steepness = 6;
  const midpoint = 0.5;
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
}

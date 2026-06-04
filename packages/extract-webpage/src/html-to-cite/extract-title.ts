/**
 * @fileoverview Utility for identifying, extracting, and normalizing document titles from HTML.
 * Handles metadata, selectors, and breadcrumb cleaning.
 */
/**
 * Extract and clean title from document
 *
 * @param {Document} document - DOM object with article content
 * @returns {string} Extracted and cleaned title
 */
export function extractTitle(document) {
  const META_TAGS = [
    'tweetmeme-title', 'dc.title', 'rbtitle', 'headline', 'title', 'og:title'
  ];

  const SELECTORS = [
    '.hentry .entry-title', 'h1#articleHeader', 'h1.articleHeader', 'h1.article',
    '.instapaper_title', '#meebo-title', 'article h1', '#entry-title', '.entry-title',
    '#entryTitle', '#entrytitle', '.entryTitle', '.entrytitle', '#articleTitle',
    '.articleTitle', 'post post-title', 'h1.title', 'h2.article', 'h1',
    'html head title', 'title'
  ];

  let title = '';

  // Check meta tags
  for (const tag of META_TAGS) {
    const metaTag = document.querySelector(`meta[name="${tag}"], meta[property="${tag}"]`);
    if (metaTag) {
      title = metaTag.getAttribute('content');
      break;
    }
  }

  // Check selectors if no title found in meta tags
  if (!title) {
    for (const selector of SELECTORS) {
      const element = document.querySelector(selector);
      if (element) {
        title = element.textContent.trim();
        break;
      }
    }
  }

  // Fall back to document.title if nothing else worked
  if (!title) {
    title = document.title;
  }

  // Clean and normalize the title
  const TITLE_SPLITTERS_RE = /( [|\-\/:\u00bb] )|( - )|(\|)/;
  const DOMAIN_ENDINGS_RE = /\.(com|net|org|io|gov|edu|co\.uk)$/i;

  // Handle split titles
  if (TITLE_SPLITTERS_RE.test(title)) {
    const splitTitle = title.split(TITLE_SPLITTERS_RE);

    // Handle breadcrumbed titles
    if (splitTitle.length >= 2) {
      const longestPart = splitTitle.reduce((acc, part) => part?.length > acc?.length ? part : acc, '');
      if (longestPart.length > 10) {
        title = longestPart;
      }
    }

  }



  // Truncate title if it's too long
  if (title.length > 150) {
    title = title.substring(0, 150);
  }

  // Strip any remaining HTML tags and normalize spaces
  return title?.replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim();
}
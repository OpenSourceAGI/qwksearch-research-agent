/**
 * @fileoverview High-performance date extraction utility for HTML documents.
 * Prioritizes meta tags, specific selectors, and URL patterns for fast results.
 */
// Constants
const DATE_PUBLISHED_META_TAGS = [
  'article:published_time',
  'displaydate',
  'dc.date',
  'dc.date.issued',
  'rbpubdate',
  'publish_date',
  'pub_date',
  'pagedate',
  'pubdate',
  'revision_date',
  'doc_date',
  'date_created',
  'content_create_date',
  'lastmodified',
  'created',
  'date',
];

const DATE_PUBLISHED_SELECTORS = [
  '.hentry .dtstamp.published',
  '.hentry .published',
  '.hentry .dtstamp.updated',
  '.hentry .updated',
  '.single .published',
  '.meta .published',
  '.meta .postDate',
  '.entry-date',
  '.byline .date',
  '.postmetadata .date',
  '.article_datetime',
  '.date-header',
  '.story-date',
  '.dateStamp',
  '#story .datetime',
  '.dateline',
  '.pubdate',
];

const abbrevMonthsStr = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';
const DATE_PUBLISHED_URL_RES = [
  new RegExp('/(20\\d{2}/\\d{2}/\\d{2})/', 'i'),
  new RegExp('(20\\d{2}-[01]\\d-[0-3]\\d)', 'i'),
  new RegExp(`/(20\\d{2}/${abbrevMonthsStr}/[0-3]\\d)/`, 'i'),
];

const MS_DATE_STRING = /^\d{13}$/;
const SEC_DATE_STRING = /^\d{10}$/;
const CLEAN_DATE_STRING_RE = /^(.+?)(?: [a-z]{3})?(?::\d{2}| \d{4})? (?:[a-z]{3} )?[a-z]{3}$/i;
const TIME_AGO_STRING = /(\d+)\s+(.*?)\s+ago/;
const TIME_NOW_STRING = /^\s*(now|\d{1,2}\s*min(ute)?s?)\s*$/i;

/**
 * Extract date from document using various methods
 *
 * @param {Document} document - DOM object with article content
 * @param {string} url - URL of the page
 * @returns {string|null} Extracted date or null if not found
 */
export function extractDateQuick(document, url) {
  let datePublished;

  // Helper function to extract content from meta tags
  function extractFromMeta(tags) {
    for (const tag of tags) {
      const metaTag = document.querySelector(`meta[name="${tag}"], meta[property="${tag}"]`);
      if (metaTag) {
        return metaTag.getAttribute('content');
      }
    }
    return null;
  }

  // Helper function to extract content from selectors
  function extractFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }
    return null;
  }

  // 1. Check meta tags
  datePublished = extractFromMeta(DATE_PUBLISHED_META_TAGS);
  if (datePublished) return cleanDatePublished(datePublished);

  // 2. Check selectors
  datePublished = extractFromSelectors(DATE_PUBLISHED_SELECTORS);
  if (datePublished) return cleanDatePublished(datePublished);

  // 3. Check URL
  for (const regex of DATE_PUBLISHED_URL_RES) {
    const match = url.match(regex);
    if (match) {
      return cleanDatePublished(match[1]);
    }
  }

  // 4. Check for specific text patterns
  const textPatterns = ['Published', 'Updated', 'Posted'];
  for (const pattern of textPatterns) {
    for (const tag of ['time', 'span', 'div', 'p']) {
      const elements = document.getElementsByTagName(tag);
      for (const el of elements) {
        if (el.textContent.includes(pattern)) {
          datePublished = el.textContent.split(pattern)[1].trim();
          if (datePublished) return cleanDatePublished(datePublished);
        }
      }
    }
  }

  return null;
}

function cleanDatePublished(dateString) {
  // If string is in milliseconds or seconds, convert to int and return
  if (MS_DATE_STRING.test(dateString)) {
    return new Date(parseInt(dateString, 10)).toISOString();
  }
  if (SEC_DATE_STRING.test(dateString)) {
    return new Date(parseInt(dateString, 10) * 1000).toISOString();
  }

  dateString = cleanDateString(dateString);

  return dateString
}

function cleanDateString(dateString) {
  return dateString?.replace(CLEAN_DATE_STRING_RE, '$1').trim();
}

function createDate(dateString) {
  if (TIME_AGO_STRING.test(dateString)) {
    const [, amount, unit] = TIME_AGO_STRING.exec(dateString);
    const now = new Date();
    now.setMilliseconds(0);
    switch (unit?.toLowerCase()) {
      case 'second':
      case 'seconds':
        now.setSeconds(now.getSeconds() - parseInt(amount));
        break;
      case 'minute':
      case 'minutes':
        now.setMinutes(now.getMinutes() - parseInt(amount));
        break;
      case 'hour':
      case 'hours':
        now.setHours(now.getHours() - parseInt(amount));
        break;
      case 'day':
      case 'days':
        now.setDate(now.getDate() - parseInt(amount));
        break;
      case 'week':
      case 'weeks':
        now.setDate(now.getDate() - parseInt(amount) * 7);
        break;
      case 'month':
      case 'months':
        now.setMonth(now.getMonth() - parseInt(amount));
        break;
      case 'year':
      case 'years':
        now.setFullYear(now.getFullYear() - parseInt(amount));
        break;
    }
    return now;
  }

  if (TIME_NOW_STRING.test(dateString)) {
    return new Date();
  }

  return new Date(dateString);
}
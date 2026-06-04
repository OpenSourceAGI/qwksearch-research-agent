// @ts-nocheck
/**
 * @module research/extractor/html-to-content/extract-content/extract-content-mercury
 * @description Research library module.
 */
import { parseHTML } from "linkedom";
import {
  convertNodeTo,
  stripUnlikelyCandidates,
  convertToParagraphs,
  cleanAttributes,
  cleanHOnes,
  cleanImages,
  removeEmpty,
  rewriteTopLevel,
  stripJunkTags,
  textLength,
  linkDensity,
  removeUnlessContent,
  nodeIsSufficient,
} from "./extract-content-mercury-utils";

/**
 *  ### HTML-to-Main-Content Extractor #2
 *
 * 1. The algorithm starts by loading the HTML content using linkedom, a lightweight DOM parser for Node.js.
 * 2. It then applies a series of cleaning and scoring techniques to identify the main content of
 * the page, starting with stripping unlikely candidates (e.g., elements with class names like "comment"
 *  or "sidebar").
 * 3. The HTML is converted into a series of paragraph elements, which are then scored based on various
 *  factors such as text length, number of commas, and the presence of certain class names or IDs.
 * 4. The algorithm assigns scores to parent and grandparent elements based on the scores of their
 * children, with parents receiving the full score and grandparents receiving half.
 * 5. After scoring, the algorithm finds the top candidate element by selecting the node with the
 * highest score.
 * 6. The top candidate's siblings are then examined to see if they should be included in the main
 * content, based on their scores and other factors like link density.
 * 7. The algorithm then cleans the selected content by removing unnecessary tags, attributes, and empty
 * elements.
 * 8. It also handles special cases like cleaning up header tags, images, and other potentially irrelevant
 *  content.
 * 9. Throughout the process, the algorithm uses various regular expressions and scoring heuristics to
 * identify positive and negative indicators of content relevance.
 * 10. Finally, the cleaned and extracted content is returned as an HTML string, representing the main
 * body of the article or webpage.
 *
 * [Article Extraction Benchmark](https://trafilatura.readthedocs.io/en/latest/evaluation.html)
 *
 * @param {string} html - The HTML content to extract from.
 * @param {Object} [opts] - The options for content extraction.
 * @param {boolean} opts.stripUnlikelyCandidates default=true - Remove elements that match non-article-
 * like criteria first (e.g., elements with a classname of "comment").
 * @param {boolean} opts.weightNodes default=true - Modify an element's score based on certain classNames or
 * IDs (e.g., subtract if a node has a className of 'comment', add if a node has an ID of 'entry-content').
 * @param {boolean} opts.cleanConditionally default=true - Clean the node to remove superfluous content
 *  like forms, ads, etc. Initially, pass in the most restrictive options which will return the highest
 * quality content. On each failure, retry with slightly more lax options.
 * @returns {string} The extracted content as an HTML string, or null if extraction fails.
 * @author [vtempest (2025)](https://github.com/vtempest)
 * Based on [Postlight Mercury Parser (2017-)](https://github.com/postlight/parser/tree/main/src)
 * @example var url =  "https://en.wikipedia.org/wiki/David_Hilbert"
 * var html = await (await fetch(url)).text();
 * var content = extractMainContentFromHTML(html);
 * console.log(content); // HTML content of main article body
 * @category Extract
 */
export function extractMainContentFromHTML2(html, opts) {
  opts = {
    stripUnlikelyCandidates: true,
    weightNodes: true,
    cleanConditionally: true,
    ...opts,
  };

  if (!html) return;
  const document = parseHTML(html)?.document;

  if (!document) return;

  var title = document.querySelector("title")?.textContent.trim();

  // Cascade through our extraction-specific opts in an ordered fashion,
  // turning them off as we try to extract content.
  let node = getContentNode(document, title, opts);

  if (nodeIsSufficient(node)) {
    return cleanAndReturnNode(node, document);
  }

  // We didn't succeed on first pass, one by one disable our
  // extraction opts and try again.
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Reflect.ownKeys(opts).filter((k) => opts[k] === true)) {
    opts[key] = false;
    const { document: newDocument } = parseHTML(html);

    node = getContentNode(newDocument, title, opts);

    if (nodeIsSufficient(node)) {
      break;
    }
  }

  return cleanAndReturnNode(node, document);
}

// A list of tags that should be ignored when trying to find the top candidate
// for a document.
const NON_TOP_CANDIDATE_TAGS = [
  "br",
  "b",
  "i",
  "label",
  "hr",
  "area",
  "base",
  "basefont",
  "input",
  "img",
  "link",
  "meta",
];

const NON_TOP_CANDIDATE_TAGS_RE = new RegExp(
  `^(${NON_TOP_CANDIDATE_TAGS.join("|")})$`,
  "i"
);

const PHOTO_HINTS = ["figure", "photo", "image", "caption"];
const PHOTO_HINTS_RE = new RegExp(PHOTO_HINTS.join("|"), "i");

// A list of strings that denote a positive scoring for this content as being
// an article container. Checked against className and id.
//
// TODO: Perhaps have these scale based on their odds of being quality?
const POSITIVE_SCORE_HINTS = [
  "article",
  "articlecontent",
  "instapaper_body",
  "blog",
  "body",
  "content",
  "entry-content-asset",
  "entry",
  "hentry",
  "main",
  "Normal",
  "page",
  "pagination",
  "permalink",
  "post",
  "story",
  "text",
  "[-_]copy", // usatoday
  "\\Bcopy",
];

// The above list, joined into a matching regular expression
const POSITIVE_SCORE_RE = new RegExp(POSITIVE_SCORE_HINTS.join("|"), "i");

// Readability publisher-specific guidelines
const READABILITY_ASSET = new RegExp("entry-content-asset", "i");

const PARAGRAPH_SCORE_TAGS = new RegExp("^(p|li|span|pre)$", "i");
const CHILD_CONTENT_TAGS = new RegExp("^(td|blockquote|ol|ul|dl)$", "i");
const BAD_TAGS = new RegExp("^(address|form)$", "i");

// A list of strings that denote a negative scoring for this content as being
// an article container. Checked against className and id.
//
// TODO: Perhaps have these scale based on their odds of being quality?
const NEGATIVE_SCORE_HINTS = [
  "adbox",
  "advert",
  "author",
  "bio",
  "bookmark",
  "bottom",
  "byline",
  "clear",
  "com-",
  "combx",
  "comment",
  "comment\\B",
  "contact",
  "copy",
  "credit",
  "crumb",
  "date",
  "deck",
  "excerpt",
  "featured", // tnr.com has a featured_content which throws us off
  "foot",
  "footer",
  "footnote",
  "graf",
  "head",
  "info",
  "infotext", // newscientist.com copyright
  "instapaper_ignore",
  "jump",
  "linebreak",
  "link",
  "masthead",
  "media",
  "meta",
  "modal",
  "outbrain", // slate.com junk
  "promo",
  "pr_", // autoblog - press release
  "related",
  "respond",
  "roundcontent", // lifehacker restricted content warning
  "scroll",
  "secondary",
  "share",
  "shopping",
  "shoutbox",
  "side",
  "sidebar",
  "sponsor",
  "stamp",
  "sub",
  "summary",
  "tags",
  "tools",
  "widget",
];
// The above list, joined into a matching regular expression
const NEGATIVE_SCORE_RE = new RegExp(NEGATIVE_SCORE_HINTS.join("|"), "i");

// A list of selectors that specify, very clearly, either hNews or other
// very content-specific style content, like Blogger templates.
// More examples here: http://microformats.org/wiki/blog-post-formats
const HNEWS_CONTENT_SELECTORS = [
  [".hentry", ".entry-content"],
  ["entry", ".entry-content"],
  [".entry", ".entry_content"],
  [".post", ".postbody"],
  [".post", ".post_body"],
  [".post", ".post-body"],
];

/**
 * Normalizes spaces in a given text string.
 * @param {string} text - The text to normalize.
 * @returns {string} The normalized text.
 */
function normalizeSpaces(text) {
  return text.replace(/\s{2,}(?![^<>]*<\/(pre|code|textarea)>)/g, " ").trim();
}

/**
 * Cleans and returns the HTML of a given node.
 * @param {Node} node - The node to clean and return.
 * @param {Document} document - The document object.
 * @returns {string|null} The cleaned HTML string or null if no node is provided.
 */
function cleanAndReturnNode(node, document) {
  if (!node) {
    return null;
  }

  return normalizeSpaces(node.outerHTML);
}

/**
 * Gets the content node from the document.
 * @param {Document} document - The document object.
 * @param {string} title - The title of the document.
 * @param {Object} opts - The options for content extraction.
 * @returns {Node} The content node.
 */
function getContentNode(document, title, opts) {
  return cleanContent(extractBestNode(document, opts), {
    document,
    cleanConditionally: opts.cleanConditionally,
    title,
  });
}

/**
 * Gets the score of a node.
 * @param {Node} node - The node to get the score from.
 * @returns {number|null} The score of the node or null if no score is set.
 */
function getScore(node) {
  return parseFloat(node.getAttribute("score")) || null;
}

/**
 * Scores the number of commas in a text.
 * @param {string} text - The text to score.
 * @returns {number} The number of commas in the text.
 */
function scoreCommas(text) {
  return (text.match(/,/g) || []).length;
}

/**
 * Converts span elements to div elements.
 * @param {Node} node - The node to convert.
 * @param {Document} document - The document object.
 */
function convertSpans(node, document) {
  if (node?.tagName?.toLowerCase() === "span") {
    // convert spans to divs
    convertNodeTo(node, document, "div");
  }
}

/**
 * Adds a score to a node and its parent elements.
 * @param {Node} node - The node to add the score to.
 * @param {Document} document - The document object.
 * @param {number} score - The score to add.
 */
function addScoreTo(node, document, score) {
  if (node) {
    convertSpans(node, document);
    addScore(node, document, score);
  }
}

/**
 * Scores paragraph elements in the document.
 * @param {Document} document - The document object.
 * @param {boolean} weightNodes - Whether to weight nodes or not.
 * @returns {Document} The document with scored paragraphs.
 */
function scorePs(document, weightNodes) {
  document.querySelectorAll("p, pre").forEach((node) => {
    if (!node.hasAttribute("score")) {
      // The raw score for this paragraph, before we add any parent/child
      // scores.
      node = setScore(
        node,
        document,
        getOrInitScore(node, document, weightNodes)
      );

      const parent = node.parentNode;
      const rawScore = scoreNode(node);

      addScoreTo(parent, document, rawScore, weightNodes);
      if (parent) {
        // Add half of the individual content score to the
        // grandparent
        addScoreTo(parent.parentNode, document, rawScore / 2, weightNodes);
      }
    }
  });

  return document;
}

/**
 * Scores the content of the document.
 * @param {Document} document - The document object.
 * @param {boolean} weightNodes - Whether to weight nodes or not.
 * @returns {Document} The document with scored content.
 */
function scoreContent(document, weightNodes = true) {
  // First, look for special hNews based selectors and give them a big
  // boost, if they exist
  HNEWS_CONTENT_SELECTORS.forEach(([parentSelector, childSelector]) => {
    document
      .querySelectorAll(`${parentSelector} ${childSelector}`)
      .forEach((node) => {
        addScore(node.closest(parentSelector), document, 80);
      });
  });

  // Doubling this again
  // Previous solution caused a bug
  // in which parents weren't retaining
  // scores. This is not ideal, and
  // should be fixed.
  scorePs(document, weightNodes);
  scorePs(document, weightNodes);

  return document;
}

/**
 * Scores the length of text.
 * @param {number} textLength - The length of the text.
 * @param {string} tagName - The tag name of the element.
 * @returns {number} The score based on text length.
 */
function scoreLength(textLength, tagName = "p") {
  const chunks = textLength / 50;

  if (chunks > 0) {
    let lengthBonus;

    // No idea why p or pre are being tamped down here
    // but just following the source for now
    // Not even sure why tagName is included here,
    // since this is only being called from the context
    // of scoreParagraph
    if (new RegExp("^(p|pre)$", "i").test(tagName)) {
      lengthBonus = chunks - 2;
    } else {
      lengthBonus = chunks - 1.25;
    }

    return Math.min(Math.max(lengthBonus, 0), 3);
  }

  return 0;
}

/**
 * Sets the score attribute of a node.
 * @param {Node} node - The node to set the score on.
 * @param {Document} document - The document object.
 * @param {number} score - The score to set.
 * @returns {Node} The node with the set score.
 * @private
 */
export function setScore(node, document, score) {
  node.setAttribute("score", score);
  return node;
}

/**
 * Scores a paragraph node.
 * @param {Node} node - The paragraph node to score.
 * @private
 * @returns {number} The score of the paragraph.
 */
export function scoreParagraph(node) {
  let score = 1;
  const text = node.textContent.trim();
  const textLength = text.length;

  // If this paragraph is less than 25 characters, don't count it.
  if (textLength < 25) {
    return 0;
  }

  // Add points for any commas within this paragraph
  score += scoreCommas(text);

  // For every 50 characters in this paragraph, add another point. Up
  // to 3 points.
  score += scoreLength(textLength);

  // Articles can end with short paragraphs when people are being clever
  // but they can also end with short paragraphs setting up lists of junk
  // that we strip. This negative tweaks junk setup paragraphs just below
  // the cutoff threshold.
  if (text.slice(-1) === ":") {
    score -= 1;
  }

  return score;
}

// Score an individual node. Has some smarts for paragraphs, otherwise
// just scores based on tag.
function scoreNode(node) {
  const tagName = node.tagName?.toLowerCase();
  // if (!tagName) return 0;

  // TODO: Consider ordering by most likely.
  // E.g., if divs are a more common tag on a page,
  // Could save doing that regex test on every node \u2013 AP
  if (PARAGRAPH_SCORE_TAGS.test(tagName)) {
    return scoreParagraph(node);
  }
  if (tagName === "div") {
    return 5;
  }
  if (CHILD_CONTENT_TAGS.test(tagName)) {
    return 3;
  }
  if (BAD_TAGS.test(tagName)) {
    return -3;
  }
  if (tagName === "th") {
    return -5;
  }

  return 0;
}

function addScore(node, document, amount) {
  try {
    const score = getOrInitScore(node, document) + amount;
    setScore(node, document, score);
  } catch (e) {
    // Ignoring; error occurs in scoreNode
  }

  return node;
}

// Adds 1/4 of a child's score to its parent
function addToParent(node, document, score) {
  const parent = node.parentNode;
  if (parent) {
    addScore(parent, document, score * 0.25);
  }

  return node;
}

// Using a variety of scoring techniques, extract the content most
// likely to be article text.
//
// If strip_unlikely_candidates is True, remove any elements that
// match certain criteria first. (Like, does this element have a
// classname of "comment")
//
// If weight_nodes is True, use classNames and IDs to determine the
// worthiness of nodes.
//
// Returns a DOM node
function extractBestNode(document, opts) {
  if (opts.stripUnlikelyCandidates) {
    document = stripUnlikelyCandidates(document);
  }

  document = convertToParagraphs(document);
  document = scoreContent(document, opts.weightNodes);
  const topCandidate = findTopCandidate(document);

  return topCandidate;
}

// Clean our article content, returning a new, cleaned node.
function cleanContent(
  article,
  { document, cleanConditionally = true, title = "", defaultCleaner = true }
) {
  // Rewrite the tag name to div if it's a top level node like body or
  // html to avoid later complications with multiple body tags.
  rewriteTopLevel(article, document);

  // Drop small images and spacer images
  // Only do this is defaultCleaner is set to true;
  // this can sometimes be too aggressive.
  if (defaultCleaner) cleanImages(article, document);

  // Drop certain tags like <title>, etc
  // This is -mostly- for cleanliness, not security.
  stripJunkTags(article, document);

  // H1 tags are typically the article title, which should be extracted
  // by the title extractor instead. If there's less than 3 of them (<3),
  // strip them. Otherwise, turn 'em into H2s.
  cleanHOnes(article, document);

  // Clean headers
  cleanHeaders(article, document, title);

  // We used to clean UL's and OL's here, but it was leading to
  // too many in-article lists being removed. Consider a better
  // way to detect menus particularly and remove them.
  // Also optionally running, since it can be overly aggressive.
  if (defaultCleaner) cleanTags(article, document, cleanConditionally);

  // Remove empty paragraph nodes
  removeEmpty(article, document);

  // Remove unnecessary attributes
  cleanAttributes(article, document);

  return article;
}

// After we've calculated scores, loop through all of the possible
// candidate nodes we found and find the one with the highest score.
function findTopCandidate(document) {
  let candidate;
  let topScore = 0;

  document.querySelectorAll("[score]").forEach((node) => {
    // Ignore tags like BR, HR, etc
    if (NON_TOP_CANDIDATE_TAGS_RE.test(node.tagName)) {
      return;
    }

    const score = getScore(node);

    if (score > topScore) {
      topScore = score;
      candidate = node;
    }
  });

  // If we don't have a candidate, return the body
  // or whatever the first element is
  if (!candidate) {
    return document.body || document.querySelector("*");
  }

  candidate = mergeSiblings(candidate, topScore, document);

  return candidate;
}

// gets and returns the score if it exists
// if not, initializes a score based on
// the node's tag type
function getOrInitScore(node, document, weightNodes = true) {
  let score = getScore(node);

  if (score) {
    return score;
  }

  score = scoreNode(node);

  if (weightNodes) {
    score += getWeight(node);
  }

  addToParent(node, document, score);

  return score;
}

// Get the score of a node based on its className and id.
function getWeight(node) {
  const classes = node.getAttribute("class");
  const id = node.getAttribute("id");
  let score = 0;

  if (id) {
    // if id exists, try to score on both positive and negative
    if (POSITIVE_SCORE_RE.test(id)) {
      score += 25;
    }
    if (NEGATIVE_SCORE_RE.test(id)) {
      score -= 25;
    }
  }

  if (classes) {
    if (score === 0) {
      // if classes exist and id did not contribute to score
      // try to score on both positive and negative
      if (POSITIVE_SCORE_RE.test(classes)) {
        score += 25;
      }
      if (NEGATIVE_SCORE_RE.test(classes)) {
        score -= 25;
      }
    }

    // even if score has been set by id, add score for
    // possible photo matches
    // "try to keep photos if we can"
    if (PHOTO_HINTS_RE.test(classes)) {
      score += 10;
    }

    // add 25 if class matches entry-content-asset,
    // a class apparently instructed for use in the
    // Readability publisher guidelines
    // https://www.readability.com/developers/guidelines
    if (READABILITY_ASSET.test(classes)) {
      score += 25;
    }
  }

  return score;
}

/**
 * Checks if a given text appears to have an ending sentence within it.
 * @param {string} text - The text to check for sentence endings.
 * @returns {boolean} True if the text appears to have an ending sentence, false otherwise.
 */
function hasSentenceEnd(text) {
  return new RegExp(".( |$)").test(text);
}

/**
 * Merges siblings of the top candidate that are decently scored.
 * This function looks through the siblings of the top candidate to see if any of them
 * are decently scored. If they are, they may be split parts of the content
 * (like two divs, a preamble and a body).
 *
 * @param {Element} candidate - The top candidate element.
 * @param {number} topScore - The score of the top candidate.
 * @param {Document} document - The document object.
 * @returns {Element} The candidate element, potentially with merged siblings.
 */
function mergeSiblings(candidate, topScore, document) {
  if (!candidate.parentNode) {
    return candidate;
  }

  const siblingScoreThreshold = Math.max(10, topScore * 0.25);
  const wrappingDiv = document.createElement("div");

  Array.from(candidate.parentNode.children).forEach((sibling) => {
    // Ignore tags like BR, HR, etc
    if (NON_TOP_CANDIDATE_TAGS_RE.test(sibling.tagName)) {
      return null;
    }

    const siblingScore = getScore(sibling);
    if (siblingScore) {
      if (sibling === candidate) {
        wrappingDiv.appendChild(sibling);
      } else {
        let contentBonus = 0;
        const density = linkDensity(sibling);

        // If sibling has a very low link density,
        // give it a small bonus
        if (density < 0.05) {
          contentBonus += 20;
        }

        // If sibling has a high link density,
        // give it a penalty
        if (density >= 0.5) {
          contentBonus -= 20;
        }

        // If sibling node has the same class as
        // candidate, give it a bonus
        if (sibling.getAttribute("class") === candidate.getAttribute("class")) {
          contentBonus += topScore * 0.2;
        }

        const newScore = siblingScore + contentBonus;

        if (newScore >= siblingScoreThreshold) {
          return wrappingDiv.appendChild(sibling);
        }
        if (sibling.tagName === "P") {
          const siblingContent = sibling.textContent;
          const siblingContentLength = textLength(siblingContent);

          if (siblingContentLength > 80 && density < 0.25) {
            return wrappingDiv.appendChild(sibling);
          }
          if (
            siblingContentLength <= 80 &&
            density === 0 &&
            hasSentenceEnd(siblingContent)
          ) {
            return wrappingDiv.appendChild(sibling);
          }
        }
      }
    }

    return null;
  });

  if (
    wrappingDiv.children.length === 1 &&
    wrappingDiv?.firstElementChild === candidate
  ) {
    return candidate;
  }

  return wrappingDiv;
}

function cleanTags(article, document) {
  const CLEAN_CONDITIONALLY_TAGS = [
    "ul",
    "ol",
    "table",
    "div",
    "button",
    "form",
  ];
  CLEAN_CONDITIONALLY_TAGS.forEach((tag) => {
    article.querySelectorAll(tag).forEach((node) => {
      const KEEP_CLASS = "parser-keep";

      if (
        node.classList.contains(KEEP_CLASS) ||
        node.querySelector(`.${KEEP_CLASS}`)
      )
        return;

      let weight = getScore(node);
      if (!weight) {
        weight = getOrInitScore(node, document);
        setScore(node, document, weight);
      }

      if (weight < 0) {
        node.parentNode.removeChild(node);
      } else {
        removeUnlessContent(node, document, weight);
      }
    });
  });

  return document;
}

function cleanHeaders(article, document, title = "") {
  const HEADER_TAGS = ["h2", "h3", "h4", "h5", "h6"];
  HEADER_TAGS.forEach((tag) => {
    article.querySelectorAll(tag).forEach((header) => {
      if (
        header.previousElementSibling &&
        header.previousElementSibling.tagName !== "P"
      ) {
        header.parentNode.removeChild(header);
        return;
      }

      if (normalizeSpaces(header.textContent) === title) {
        header.parentNode.removeChild(header);
        return;
      }

      if (getWeight(header) < 0) {
        header.parentNode.removeChild(header);
        return;
      }
    });
  });

  return document;
}

// @ts-nocheck
/**
 * @module research/extractor/html-to-content/extract-content/extract-content-mercury-utils
 * @description Research library module.
 */
//HTML-to-Content Postlight  Utilities

const SPACER_RE = new RegExp("transparent|spacer|blank", "i");
const KEEP_CLASS = "parser-keep";
const STRIP_OUTPUT_TAGS = [
  "title",
  "script",
  "noscript",
  "link",
  "style",
  "hr",
  "embed",
  "iframe",
  "object",
];
const WHITELIST_ATTRS = [
  "src",
  "srcset",
  "sizes",
  "type",
  "href",
  "class",
  "id",
  "alt",
  "xlink:href",
  "width",
  "height",
];
const WHITELIST_ATTRS_RE = new RegExp(`^(${WHITELIST_ATTRS.join("|")})$`, "i");
const REMOVE_EMPTY_TAGS = ["p"];
const REMOVE_EMPTY_SELECTORS = REMOVE_EMPTY_TAGS.map(
  (tag) => `${tag}:empty`
).join(",");
const UNLIKELY_CANDIDATES_BLACKLIST = [
  "ad-break",
  "adbox",
  "advert",
  "addthis",
  "agegate",
  "aux",
  "blogger-labels",
  "combx",
  "comment",
  "conversation",
  "disqus",
  "entry-unrelated",
  "extra",
  "foot",
  "header",
  "hidden",
  "loader",
  "login",
  "menu",
  "meta",
  "nav",
  "outbrain",
  "pager",
  "pagination",
  "predicta",
  "presence_control_external",
  "popup",
  "printfriendly",
  "related",
  "remove",
  "remark",
  "rss",
  "share",
  "shoutbox",
  "sidebar",
  "sociable",
  "sponsor",
  "taboola",
  "tools",
];
const UNLIKELY_CANDIDATES_WHITELIST = [
  "and",
  "article",
  "body",
  "blogindex",
  "column",
  "content",
  "entry-content-asset",
  "format",
  "hfeed",
  "hentry",
  "hatom",
  "main",
  "page",
  "posts",
  "shadow",
];
const DIV_TO_P_BLOCK_TAGS = [
  "a",
  "blockquote",
  "dl",
  "div",
  "img",
  "p",
  "pre",
  "table",
].join(",");
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
const HNEWS_CONTENT_SELECTORS = [
  [".hentry", ".entry-content"],
  ["entry", ".entry-content"],
  [".entry", ".entry_content"],
  [".post", ".postbody"],
  [".post", ".post_body"],
  [".post", ".post-body"],
];
const PHOTO_HINTS = ["figure", "photo", "image", "caption"];
const PHOTO_HINTS_RE = new RegExp(PHOTO_HINTS.join("|"), "i");
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
  "[-_]copy",
  "\\Bcopy",
];
const POSITIVE_SCORE_RE = new RegExp(POSITIVE_SCORE_HINTS.join("|"), "i");
const READABILITY_ASSET = new RegExp("entry-content-asset", "i");
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
  "featured",
  "foot",
  "footer",
  "footnote",
  "graf",
  "head",
  "info",
  "infotext",
  "instapaper_ignore",
  "jump",
  "linebreak",
  "link",
  "masthead",
  "media",
  "meta",
  "modal",
  "outbrain",
  "promo",
  "pr_",
  "related",
  "respond",
  "roundcontent",
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
const NEGATIVE_SCORE_RE = new RegExp(NEGATIVE_SCORE_HINTS.join("|"), "i");
const IS_WP_SELECTOR = "meta[name=generator][value^=WordPress]";
const DIGIT_RE = new RegExp("[0-9]");
const EXTRANEOUS_LINK_HINTS = [
  "print",
  "archive",
  "comment",
  "discuss",
  "e-mail",
  "email",
  "share",
  "reply",
  "all",
  "login",
  "sign",
  "single",
  "adx",
  "entry-unrelated",
];
const BLOCK_LEVEL_TAGS = [
  "article",
  "aside",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "col",
  "colgroup",
  "dd",
  "div",
  "dl",
  "dt",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "li",
  "map",
  "object",
  "ol",
  "output",
  "p",
  "pre",
  "progress",
  "section",
  "table",
  "tbody",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
  "video",
];
const BLOCK_LEVEL_TAGS_RE = new RegExp(
  `^(${BLOCK_LEVEL_TAGS.join("|")})$`,
  "i"
);
const candidatesBlacklist = UNLIKELY_CANDIDATES_BLACKLIST.join("|");
const CANDIDATES_BLACKLIST = new RegExp(candidatesBlacklist, "i");
const candidatesWhitelist = UNLIKELY_CANDIDATES_WHITELIST.join("|");
const CANDIDATES_WHITELIST = new RegExp(candidatesWhitelist, "i");


function normalizeSpaces(text) {
  return text.replace(/\s{2,}(?![^<>]*<\/(pre|code|textarea)>)/g, " ").trim();
}


function paragraphize(node, document, br = false) {
  if (br) {
    let sibling = node.nextSibling;
    const p = document.createElement("p");

    while (
      sibling &&
      !(sibling.tagName && BLOCK_LEVEL_TAGS_RE.test(sibling.tagName))
    ) {
      const { nextSibling } = sibling;
      p.appendChild(sibling);
      sibling = nextSibling;
    }

    node.parentNode?.replaceChild(p, node);
    node.remove();
    return document;
  }

  return document;
}


function getAttrs(node) {
  return node.attributes
    ? Array.from(node.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {})
    : {};
}


function convertNodeTo(node, document, tag = "p") {
  if (!node) {
    return document;
  }
  const attrs = getAttrs(node);

  const attribString = Object.keys(attrs)
    .map((key) => `${key}="${attrs[key]}"`)
    .join(" ");
  const html =
    node.tagName.toLowerCase() === "noscript"
      ? node.textContent
      : node.innerHTML;

  const newElement = document.createElement(tag);
  newElement.innerHTML = html;
  Object.keys(attrs).forEach((key) => newElement.setAttribute(key, attrs[key]));

  node.parentNode?.replaceChild(newElement, node);
  return document;
}


function brsToPs(document) {
  let collapsing = false;
  document.querySelectorAll("br").forEach((element) => {
    const nextElement = element.nextElementSibling;

    if (nextElement && nextElement.tagName.toLowerCase() === "br") {
      collapsing = true;
      element.remove();
    } else if (collapsing) {
      collapsing = false;
      paragraphize(element, document, true);
    }
  });

  return document;
}


function convertDivs(document) {
  document.querySelectorAll("div").forEach((div) => {
    const convertible = div.querySelectorAll(DIV_TO_P_BLOCK_TAGS).length === 0;

    if (convertible) {
      convertNodeTo(div, document, "p");
    }
  });

  return document;
}


function convertSpans(document) {
  document.querySelectorAll("span").forEach((span) => {
    const convertible = !span.closest("p, div, li, figcaption");
    if (convertible) {
      convertNodeTo(span, document, "p");
    }
  });

  return document;
}


function convertToParagraphs(document) {
  document = brsToPs(document);
  document = convertDivs(document);
  document = convertSpans(document);

  return document;
}


function cleanForHeight(img, document) {
  const height = parseInt(img.getAttribute("height"), 10);
  const width = parseInt(img.getAttribute("width"), 10) || 20;

  if ((height || 20) < 10 || width < 10) {
    img.remove();
  } else if (height) {
    img.removeAttribute("height");
  }

  return document;
}


function removeSpacers(img, document) {
  if (SPACER_RE.test(img.getAttribute("src"))) {
    img.remove();
  }

  return document;
}


function cleanImages(article, document) {
  article.querySelectorAll("img").forEach((img) => {
    cleanForHeight(img, document);
    removeSpacers(img, document);
  });

  return document;
}


function stripJunkTags(article, document, tags = []) {
  if (tags.length === 0) {
    tags = STRIP_OUTPUT_TAGS;
  }

  article.querySelectorAll(tags.join(",")).forEach((element) => {
    if (!element.classList.contains(KEEP_CLASS)) {
      element.remove();
    }
  });

  return document;
}


function cleanHOnes(article, document) {
  const hOnes = article.querySelectorAll("h1");

  if (hOnes.length < 3) {
    hOnes.forEach((node) => node.remove());
  } else {
    hOnes.forEach((node) => {
      convertNodeTo(node, document, "h2");
    });
  }

  return document;
}


function cleanAttributes(article, document) {
  return removeAllButWhitelist(
    article.parentNode ? article.parentNode : article,
    document
  );
}

function removeAllButWhitelist(article) {
  article.querySelectorAll("*").forEach((node) => {
    const attrs = getAttrs(node);

    setAttrs(
      node,
      Object.keys(attrs).reduce((acc, attr) => {
        if (WHITELIST_ATTRS_RE.test(attr)) {
          return { ...acc, [attr]: attrs[attr] };
        }

        return acc;
      }, {})
    );
  });

  article.querySelectorAll(`.${KEEP_CLASS}`).forEach((node) => {
    node.classList.remove(KEEP_CLASS);
  });

  return article;
}


function removeEmpty(article) {
  article.querySelectorAll("p").forEach((p) => {
    if (
      p.querySelectorAll("iframe, img").length === 0 &&
      p.textContent.trim() === ""
    )
      p.remove();
  });

  return article;
}


function removeUnlessContent(node, weight) {
  if (node.classList.contains("entry-content-asset")) {
    return;
  }

  const content = normalizeSpaces(node.textContent);

  if (content.match(/,/g)?.length < 10) {
    const pCount = node.querySelectorAll("p").length;
    const inputCount = node.querySelectorAll("input").length;

    if (inputCount > pCount / 3) {
      node.remove();
      return;
    }

    const contentLength = content.length;
    const imgCount = node.querySelectorAll("img").length;

    if (contentLength < 25 && imgCount === 0) {
      node.remove();
      return;
    }

    const density = linkDensity(node);

    if (weight < 25 && density > 0.2 && contentLength > 75) {
      node.remove();
      return;
    }

    if (weight >= 25 && density > 0.5) {
      const tagName = node.tagName.toLowerCase();
      const nodeIsList = tagName === "ol" || tagName === "ul";
      if (nodeIsList) {
        const previousNode = node.previousElementSibling;
        if (
          previousNode &&
          normalizeSpaces(previousNode.textContent).slice(-1) === ":"
        ) {
          return;
        }
      }

      node.remove();
      return;
    }

    const scriptCount = node.querySelectorAll("script").length;

    if (scriptCount > 0 && contentLength < 150) {
      node.remove();
    }
  }
}


function rewriteTopLevel(article, document) {
  // document.documentElement.outerHTML = `<div>${document.documentElement.innerHTML}</div>`;
  document.body.outerHTML = `<div>${document.body.innerHTML}</div>`;

  return document;
}


function textLength(text) {
  return text.trim().replace(/\s+/g, " ").length;
}


function linkDensity(node) {
  const totalTextLength = textLength(node.textContent);

  const linkText = Array.from(node.querySelectorAll("a"))
    .map((a) => a.textContent)
    .join(" ");
  const linkLength = textLength(linkText);

  if (totalTextLength > 0) {
    return linkLength / totalTextLength;
  }
  if (totalTextLength === 0 && linkLength > 0) {
    return 1;
  }

  return 0;
}


function stripTags(text, document) {
  const span = document.createElement("span");
  span.innerHTML = text;
  const cleanText = span.textContent;
  return cleanText === "" ? text : cleanText;
}


function stripUnlikelyCandidates(document) {
  document.querySelectorAll("*:not(a)").forEach((node) => {
    const classes = node.getAttribute("class");
    const id = node.getAttribute("id");
    if (!id && !classes) return;

    const classAndId = `${classes || ""} ${id || ""}`;
    if (CANDIDATES_WHITELIST.test(classAndId)) {
      return;
    }
    if (CANDIDATES_BLACKLIST.test(classAndId)) {
      node.remove();
    }
  });

  return document;
}


function withinComment(node) {
  let parent = node.parentNode;
  while (parent) {
    const attrs = getAttrs(parent);
    const { class: nodeClass, id } = attrs;
    const classAndId = `${nodeClass} ${id}`;
    if (classAndId.includes("comment")) {
      return true;
    }
    parent = parent.parentNode;
  }

  return false;
}


function nodeIsSufficient(node) {
  return node.textContent.trim().length >= 100;
}


function isWordpress(document) {
  return document.querySelectorAll(IS_WP_SELECTOR).length > 0;
}


function setAttr(node, attr, val) {
  node.setAttribute(attr, val);
  return node;
}


function setAttrs(node, attrs) {
  while (node.attributes.length > 0) {
    node.removeAttribute(node.attributes[0].name);
  }

  Object.keys(attrs).forEach((key) => {
    node.setAttribute(key, attrs[key]);
  });

  return node;
}

export {
  normalizeSpaces,
  paragraphize,
  getAttrs,
  convertNodeTo,
  brsToPs,
  convertToParagraphs,
  cleanImages,
  stripJunkTags,
  cleanHOnes,
  cleanAttributes,
  removeEmpty,
  rewriteTopLevel,
  textLength,
  linkDensity,
  stripTags,
  stripUnlikelyCandidates,
  withinComment,
  nodeIsSufficient,
  isWordpress,
  setAttr,
  removeUnlessContent,
  setAttrs,
};

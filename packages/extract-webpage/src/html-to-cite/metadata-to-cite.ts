
export interface CiteMetadata {
  author?: string;
  date?: string;
  title?: string;
  source?: string;
}

/**
 * Extract cite info from common property names in webpage's metadata
 * @param {Document} doc dom object of document
 * @returns {CiteMetadata} author, date, title, source
 */
export function extractCiteFromMetadata(doc: Document): CiteMetadata {
  if (!doc) return null;

  const commonCiteMetaTags = {
    source: ["application-name", "og:site_name", "twitter:site", "dc.title"],
    title: ["title", "og:title", "twitter:title", "parsely-title"],
    author: [
      "author",
      "creator",
      "og:creator",
      "article:author",
      "dc.creator",
      "parsely-author",
    ],
    date: [
      "article:published_time",
      "article:modified_time",
      "og:updated_time",
      "dc.date",
      "dc.date.issued",
      "dc.date.created",
      "dc:created",
      "dcterms.date",
      "datepublished",
      "datemodified",
      "updated_time",
      "modified_time",
      "published_time",
      "release_date",
      "date",
      "parsely-pub-date",
      "article:published",
      "article:published_time",
      "og:pubdate",
      "pubdate",
      "date",
      "dateCreated",
      "pdate",
      "sailthru.date",
      "dcterms.created",
    ],
  };

  const result = {};

  Array.from(doc.getElementsByTagName("meta")).forEach((metaElem) => {
    const property =
      metaElem.getAttribute("property") || metaElem.getAttribute("itemprop");
    const name = metaElem.getAttribute("name");

    for (const [key, attrs] of Object.entries(commonCiteMetaTags))
      if (
        metaElem.getAttribute("content") &&
        (attrs.includes(property?.toLowerCase()) ||
          attrs.includes(name?.toLowerCase()))
      )
        result[key] = metaElem.getAttribute("content");
  });
  return result;
}

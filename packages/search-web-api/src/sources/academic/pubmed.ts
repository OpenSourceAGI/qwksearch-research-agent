/**
 * @fileoverview Engine adapter that scrapes PubMed search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

export const pubmed: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const pageno = page || 1;
  const number_of_results = 10;
  const retstart = (pageno - 1) * number_of_results;

  const esearchParams = new URLSearchParams({
    db: "pubmed",
    term: query,
    retstart: String(retstart),
    retmax: String(number_of_results),
  });

  const esearchResponse = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${esearchParams}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  );

  if (!esearchResponse.ok) return [];

  const esearchText = await esearchResponse.text();
  const { document: esearchDoc } = parseHTML(esearchText);
  const pmids: string[] = [];
  esearchDoc.querySelectorAll("Id").forEach((elem) => {
    const pmid = elem.textContent;
    if (pmid) pmids.push(pmid);
  });

  if (pmids.length === 0) return [];

  const efetchResponse = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(",")}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  );

  if (!efetchResponse.ok) return [];

  const efetchText = await efetchResponse.text();
  const { document } = parseHTML(efetchText);

  return Array.from(document.querySelectorAll("PubmedArticle"))
    .map((article) => {
      const title =
        article.querySelector("ArticleTitle")?.textContent || "";
      const pmid = article.querySelector("PMID")?.textContent || "";
      const url = `https://www.ncbi.nlm.nih.gov/pubmed/${pmid}`;

      const abstractElements = article.querySelectorAll("AbstractText");
      const abstract = Array.from(abstractElements)
        .map((el) => el.textContent)
        .join(" ");

      const journal =
        article.querySelector("Journal Title")?.textContent || "";
      const doi =
        article.querySelector('ELocationID[EIdType="doi"]')
          ?.textContent || "";

      const authors: string[] = [];
      article.querySelectorAll("AuthorList Author").forEach((author) => {
        const firstName =
          author.querySelector("ForeName")?.textContent || "";
        const lastName =
          author.querySelector("LastName")?.textContent || "";
        const authorName = `${firstName} ${lastName}`.trim();
        if (authorName) authors.push(authorName);
      });

      const content = [
        abstract,
        journal ? `Journal: ${journal}` : "",
        authors.length ? `Authors: ${authors.join(", ")}` : "",
        doi ? `DOI: ${doi}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { url, title, content, engine: "pubmed" };
    })
    .filter((r) => r.url && r.title);
};

/**
 * @fileoverview Engine adapter that scrapes eBay marketplace search results.
 */
import { parseHTML } from "linkedom";
import { EngineFunction } from "../../types/search-engine-interface";

/**
 * eBay Shopping Search Engine
 *
 * Searches eBay marketplace for products, including:
 * - Product listings
 * - Prices and shipping info
 * - Images and thumbnails
 * - Source country information
 */
export const ebay: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    _nkw: query,
    _sacat: String(page || 1),
  });
  const response = await fetch(
    `https://www.ebay.com/sch/i.html?${params}`,
    {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }
  );
  if (!response.ok) return [];
  const html = await response.text();
  const { document } = parseHTML(html);
  const results: any[] = [];

  // XPath equivalent: //li[contains(@class, "s-item")]
  const resultels = document.querySelectorAll(
    'li.s-item, li[class*="s-item"]'
  );

  for (const el of Array.from(resultels)) {
    try {
      // Extract data from DOM
      const linkel = el.querySelector("a.s-item__link");
      const url = linkel?.getAttribute("href");

      const titleel = el.querySelector("h3.s-item__title");
      const title = titleel?.textContent?.trim();

      const contentel = el.querySelector('div[span="SECONDARY_INFO"]');
      const content = contentel?.textContent?.trim();

      const priceel = el.querySelector(
        "div.s-item__detail span.s-item__price, span.s-item__price"
      );
      const price = priceel?.textContent?.trim();

      const shippingel = el.querySelector(
        'span.s-item__shipping, span[class*="s-item__shipping"]'
      );
      const shipping = shippingel?.textContent?.trim();

      const locationel = el.querySelector(
        'span.s-item__location, span[class*="s-item__location"]'
      );
      const source_country = locationel?.textContent?.trim();

      const thumbnailel = el.querySelector("img.s-item__image-img");
      const thumbnail = thumbnailel?.getAttribute("src");

      // Skip if no title
      if (!title || title === "") {
        continue;
      }

      const result: any = {
        url: url || "",
        title,
        content: content || "",
        price,
        shipping,
        thumbnail,
        source_country,
        template: "products",
        engine: "ebay",
      };

      results.push(result);
    } catch (error) {
      // Skip malformed results
      continue;
    }
  }

  return results;
};

/**
 * @fileoverview Reads the outline (H1–H3 headings) out of an article's HTML and
 * gives every heading an `id`, so the outline can link to it and a scroll-spy
 * can find it. Shape-compatible with Fumadocs' `TOCItemType`, which is what
 * the outline renders.
 */

/** One heading in the outline. Same shape as Fumadocs' `TOCItemType`. */
export interface ArticleOutlineItem {
  title: string;
  /** `#id` of the heading element. */
  url: string;
  /** 1 for H1, 2 for H2, 3 for H3. */
  depth: number;
}

/** Heading levels the outline lists. */
export const OUTLINE_HEADING_SELECTOR = 'h1, h2, h3';

const SAFE_ID = /^[A-Za-z][\w:.-]*$/;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'section'
  );
}

/**
 * Finds every H1, H2 and H3 with text in `html`, in document order.
 *
 * A heading keeps its own `id` when it has a plain one that no earlier heading
 * uses (footnote and in-page links may point at it); otherwise it gets
 * `outline-<n>-<slug>`. The returned `html` is `html` with those ids applied —
 * render that, so the outline's links resolve. Without headings, or outside a
 * browser (no `DOMParser`), `html` comes back untouched with no items.
 */
export function extractOutline(html: string): { html: string; items: ArticleOutlineItem[] } {
  if (!html || typeof DOMParser === 'undefined') return { html, items: [] };

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const headings = Array.from(doc.body.querySelectorAll<HTMLElement>(OUTLINE_HEADING_SELECTOR)).filter(
    (heading) => (heading.textContent ?? '').trim() !== '',
  );
  if (headings.length === 0) return { html, items: [] };

  const taken = new Set(headings.map((heading) => heading.id).filter((id) => SAFE_ID.test(id)));
  const used = new Set<string>();
  const items = headings.map((heading, index) => {
    let id = heading.id;
    if (!SAFE_ID.test(id) || used.has(id)) {
      const title = (heading.textContent ?? '').trim();
      id = `outline-${index + 1}-${slugify(title)}`;
      while (taken.has(id) || used.has(id)) id = `${id}-x`;
      heading.id = id;
    }
    used.add(id);
    return {
      title: (heading.textContent ?? '').replace(/\s+/g, ' ').trim(),
      url: `#${id}`,
      depth: Number(heading.tagName.slice(1)),
    };
  });

  return { html: doc.body.innerHTML, items };
}

function luminance(color: string): number | null {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Whether the page is showing a dark theme. These sites toggle a `dark`
 * class or a theme attribute on <html>, and otherwise paint the body, so
 * check those before falling back to the OS preference.
 */
export function isDarkPage(doc: Document = document): boolean {
  const view = doc.defaultView;
  for (const el of [doc.documentElement, doc.body]) {
    if (!el) continue;
    const marker = [
      el.className?.toString(),
      el.getAttribute('data-theme'),
      el.getAttribute('data-mode'),
      el.getAttribute('data-color-mode'),
      el.getAttribute('data-color-scheme'),
      el.style?.colorScheme,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (/(^|[\s-])dark($|[\s-])/.test(marker)) return true;
    if (/(^|[\s-])light($|[\s-])/.test(marker)) return false;
  }
  if (view) {
    for (const el of [doc.body, doc.documentElement]) {
      const l = el ? luminance(view.getComputedStyle(el).backgroundColor) : null;
      if (l !== null) return l < 0.45;
    }
    return view.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
  return false;
}

/**
 * Turns a rendered chat message back into Markdown. jsdom and real pages
 * both work: it only walks the DOM and never relies on layout.
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'SVG', 'BUTTON', 'NOSCRIPT', 'TEMPLATE', 'INPUT', 'TEXTAREA', 'SELECT']);
const SKIP_SELECTOR = [
  '.sr-only',
  '.visually-hidden',
  '.cdk-visually-hidden',
  '[aria-hidden="true"]',
  '[hidden]',
  '[data-testid*="copy" i]',
].join(',');

function isSkipped(el: Element): boolean {
  return SKIP_TAGS.has(el.tagName.toUpperCase()) || el.matches(SKIP_SELECTOR);
}

function languageOf(pre: Element): string {
  const code = pre.querySelector('code') ?? pre;
  const holder = [code, pre].find((n) => /(?:language|lang)-/.test(n.className?.toString() ?? ''));
  const match = holder?.className.toString().match(/(?:language|lang)-([\w+#.-]+)/);
  if (match) return match[1];
  return pre.getAttribute('data-language') ?? code.getAttribute('data-language') ?? '';
}

function fenced(text: string, lang: string): string {
  const body = text.replace(/\n+$/, '');
  const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${lang}\n${body}\n${fence}`;
}

function inline(node: Node, ctx: Ctx): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += render(child, ctx);
  });
  return out;
}

interface Ctx {
  listDepth: number;
}

function listItems(list: Element, ctx: Ctx): string {
  const ordered = list.tagName === 'OL';
  let n = Number.parseInt(list.getAttribute('start') ?? '1', 10) || 1;
  const indent = '  '.repeat(ctx.listDepth);
  const lines: string[] = [];
  for (const child of Array.from(list.children)) {
    if (child.tagName !== 'LI' || isSkipped(child)) continue;
    const body = blockChildren(child, { listDepth: ctx.listDepth + 1 })
      .trim()
      .replace(/\n{2,}(?=\s*(?:-|\d+\.)\s)/g, '\n');
    const marker = ordered ? `${n++}.` : '-';
    const [first, ...rest] = body.split('\n');
    lines.push(`${indent}${marker} ${first}`);
    lines.push(...rest);
  }
  return lines.join('\n');
}

function tableToMarkdown(table: Element, ctx: Ctx): string {
  const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.children)
      .filter((c) => c.tagName === 'TH' || c.tagName === 'TD')
      .map((c) => inline(c, ctx).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim())
  );
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill('')];
  const [head, ...body] = rows.map(pad);
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

/** Renders children, separating block-level pieces by a blank line. */
function blockChildren(node: Node, ctx: Ctx): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += render(child, ctx);
  });
  return out;
}

function render(node: Node, ctx: Ctx): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/[ \t\r\n]+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  if (isSkipped(el)) return '';

  switch (el.tagName.toUpperCase()) {
    case 'BR':
      return '\n';
    case 'HR':
      return '\n\n---\n\n';
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      const level = Number(el.tagName[1]);
      return `\n\n${'#'.repeat(level)} ${inline(el, ctx).trim()}\n\n`;
    }
    case 'P':
      return `\n\n${inline(el, ctx).trim()}\n\n`;
    case 'PRE':
      return `\n\n${fenced(el.querySelector('code')?.textContent ?? el.textContent ?? '', languageOf(el))}\n\n`;
    case 'CODE': {
      const text = el.textContent ?? '';
      const ticks = '`'.repeat(Math.max(1, ...(text.match(/`+/g) ?? []).map((r) => r.length + 1)));
      return `${ticks}${text}${ticks}`;
    }
    case 'STRONG':
    case 'B': {
      const t = inline(el, ctx).trim();
      return t ? `**${t}**` : '';
    }
    case 'EM':
    case 'I': {
      const t = inline(el, ctx).trim();
      return t ? `*${t}*` : '';
    }
    case 'DEL':
    case 'S': {
      const t = inline(el, ctx).trim();
      return t ? `~~${t}~~` : '';
    }
    case 'A': {
      const text = inline(el, ctx).trim();
      const href = el.getAttribute('href');
      if (!text) return '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || text === href) return text;
      return `[${text}](${href})`;
    }
    case 'IMG':
      return el.getAttribute('alt') ? `![${el.getAttribute('alt')}](${el.getAttribute('src') ?? ''})` : '';
    case 'UL':
    case 'OL':
      return `\n\n${listItems(el, ctx)}\n\n`;
    case 'BLOCKQUOTE': {
      const body = blockChildren(el, ctx).trim();
      return `\n\n${body.split('\n').map((l) => `> ${l}`.trimEnd()).join('\n')}\n\n`;
    }
    case 'TABLE':
      return `\n\n${tableToMarkdown(el, ctx)}\n\n`;
    case 'DIV':
    case 'SECTION':
    case 'ARTICLE':
    case 'LI':
    case 'DETAILS':
      return `\n${blockChildren(el, ctx)}\n`;
    default:
      return blockChildren(el, ctx);
  }
}

/** Collapses the blank-line padding the renderer leaves between blocks, leaving fenced code untouched. */
function tidy(text: string): string {
  const out: string[] = [];
  let fence = '';
  for (const line of text.split('\n')) {
    const opener = line.match(/^(`{3,})/);
    if (!fence && opener) fence = opener[1];
    else if (fence && line.startsWith(fence) && line.trim() === fence) {
      out.push(line);
      fence = '';
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }
    const trimmed = line.replace(/[ \t]+$/, '');
    if (trimmed === '' && out[out.length - 1] === '') continue;
    out.push(trimmed);
  }
  return out.join('\n').trim();
}

/** Markdown for the content of `el`; does not mutate the page. */
export function elementToMarkdown(el: Element): string {
  return tidy(render(el, { listDepth: 0 }));
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'BLOCKQUOTE', 'SECTION', 'ARTICLE']);

function plain(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  if (isSkipped(el)) return '';
  if (el.tagName === 'BR') return '\n';
  let out = '';
  el.childNodes.forEach((child) => {
    out += plain(child);
  });
  return BLOCK_TAGS.has(el.tagName.toUpperCase()) ? `\n${out}\n` : out;
}

/**
 * The text of `el` as typed: line breaks and spacing kept, no Markdown added.
 * Used for the user's own turns, which are not rendered Markdown (a pasted
 * `# comment` must stay as written).
 */
export function elementToPlainText(el: Element): string {
  return plain(el)
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @fileoverview DOCX → HTML conversion, driven with minimal real .docx archives
 * built in memory (a docx is a zip of XML parts).
 */
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertDOCXToHTML } from '../src/url-to-content/docx-to-content';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const doc = (body: string) => `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`;
const run = (text: string, rPr = '') => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t>${text}</w:t></w:r>`;
const para = (inner: string, pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${inner}</w:p>`;

async function docx(body: string, parts: Record<string, string> = {}): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', doc(body));
  for (const [path, xml] of Object.entries(parts)) zip.file(path, xml);
  return zip.generateAsync({ type: 'arraybuffer' });
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('convertDOCXToHTML — structure', () => {
  it('wraps paragraphs in a section', async () => {
    const html = await convertDOCXToHTML(await docx(para(run('Hello')) + para(run('World'))));
    expect(html).toContain('<section>');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('<p>World</p>');
    expect(html.indexOf('Hello')).toBeLessThan(html.indexOf('World'));
  });

  it('splits sections at section properties', async () => {
    const html = await convertDOCXToHTML(
      await docx(para(run('One')) + '<w:sectPr><w:pgSz w:w="1"/></w:sectPr>' + para(run('Two'))),
    );
    expect(html.match(/<section/g)).toHaveLength(2);
  });

  it('drops empty paragraphs and whitespace-only runs, but keeps a page-break-only paragraph', async () => {
    const html = await convertDOCXToHTML(
      await docx(para('') + para(run('   ')) + para('', '<w:pageBreakBefore/>') + para(run('Kept'))),
    );
    expect(html).toContain('Kept');
    expect(html).toContain('page-break-before: always');
    // Only the page-break paragraph and the one with text survive.
    expect(html.match(/<p/g)).toHaveLength(2);
  });

  it('escapes markup and collapses whitespace in text', async () => {
    const html = await convertDOCXToHTML(await docx(para(run('a &amp; b &lt;i&gt;   spaced'))));
    expect(html).toContain('a &amp;amp; b &amp;lt;i&amp;gt; spaced');
  });

  it('emits tab and break runs', async () => {
    const html = await convertDOCXToHTML(
      await docx(para('<w:r><w:t>A</w:t><w:tab/></w:r><w:r><w:t>B</w:t><w:br/></w:r>')),
    );
    expect(html).toContain('A');
    expect(html).toContain('&nbsp;&nbsp;&nbsp;&nbsp;');
    expect(html).toContain('<br>');
  });
});

describe('convertDOCXToHTML — formatting', () => {
  it('turns run properties into inline CSS', async () => {
    const rPr = '<w:b /><w:i /><w:u /><w:strike /><w:color w:val="FF0000"/><w:highlight w:val="yellow"/><w:sz w:val="28"/><w:rFonts w:ascii="Arial"/>';
    const html = await convertDOCXToHTML(await docx(para(run('Styled', rPr))));
    for (const css of [
      'font-weight: bold',
      'font-style: italic',
      'text-decoration: underline',
      'text-decoration: line-through',
      'color: #FF0000',
      'background-color: yellow',
      'font-size: 14pt',
      'font-family: Arial',
    ]) {
      expect(html).toContain(css);
    }
    expect(html).toContain('>Styled</span>');
  });

  it('turns paragraph properties into inline CSS', async () => {
    const pPr = '<w:jc w:val="center"/><w:spacing w:line="480"/><w:ind w:left="720"/>';
    const html = await convertDOCXToHTML(await docx(para(run('Para'), pPr)));
    expect(html).toContain('text-align: center');
    expect(html).toContain('line-height: 2');
    expect(html).toContain('margin-left: 36pt');
  });

  it('resolves a named paragraph style from styles.xml', async () => {
    const styles =
      `<w:styles ${W}><w:style w:type="paragraph" w:styleId="Fancy"><w:rPr><w:b/><w:color w:val="00FF00"/><w:jc w:val="right"/></w:rPr></w:style></w:styles>`;
    const html = await convertDOCXToHTML(
      await docx(para(run('Fancy text'), '<w:pStyle w:val="Fancy"/>'), { 'word/styles.xml': styles }),
    );
    expect(html).toContain('color: #00FF00');
    expect(html).toContain('text-align: right');
  });

  it('emits document defaults as body CSS', async () => {
    const styles =
      `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/><w:color w:val="333333"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
    const html = await convertDOCXToHTML(await docx(para(run('x')), { 'word/styles.xml': styles }));
    expect(html).toContain('<style>');
    expect(html).toContain('color: #333333');
    expect(html).toContain('font-family: Calibri');
    expect(html).toContain('font-size: 11pt');
  });

  it('skips style parsing when includeStyles is false', async () => {
    const styles =
      `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
    const html = await convertDOCXToHTML(await docx(para(run('x')), { 'word/styles.xml': styles }), { includeStyles: false });
    expect(html).not.toContain('Calibri');
  });
});

describe('convertDOCXToHTML — input types', () => {
  it('accepts an ArrayBuffer, Uint8Array, Buffer and Blob', async () => {
    const buf = await docx(para(run('From bytes')));
    expect(await convertDOCXToHTML(buf)).toContain('From bytes');
    expect(await convertDOCXToHTML(new Uint8Array(buf))).toContain('From bytes');
    expect(await convertDOCXToHTML(Buffer.from(buf))).toContain('From bytes');
    expect(await convertDOCXToHTML(new Blob([buf]))).toContain('From bytes');
  });

  it('fetches a URL string', async () => {
    const buf = await docx(para(run('From the web')));
    const fetchMock = vi.fn(async () => new Response(buf, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await convertDOCXToHTML('https://example.com/file.docx')).toContain('From the web');
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/file.docx');
  });

  it('fails on an HTTP error, an invalid input type and a corrupt archive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    await expect(convertDOCXToHTML('https://example.com/missing.docx')).rejects.toThrow('HTTP 404');
    await expect(convertDOCXToHTML(42 as any)).rejects.toThrow('Invalid input type');
    await expect(convertDOCXToHTML(new TextEncoder().encode('not a zip').buffer as ArrayBuffer)).rejects.toThrow();
  });
});

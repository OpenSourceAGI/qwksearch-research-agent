import { describe, expect, it } from 'vitest';
import { renderEditorWebviewHtml } from '../src/webviewHtml';
import { Uri, createWebview } from './stubs/vscode';
import type * as vscode from 'vscode';

function render(title = 'Reason Editor') {
  const webview = createWebview() as unknown as vscode.Webview;
  return renderEditorWebviewHtml(webview, Uri.file('/ext/dist') as unknown as vscode.Uri, title);
}

function cspOf(html: string): string {
  return html.match(/content="([^"]*)"/)![1];
}

describe('renderEditorWebviewHtml', () => {
  it('returns a complete HTML document with a root mount point', () => {
    const html = render();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('</html>');
  });

  it('injects the title', () => {
    expect(render('My Document')).toContain('<title>My Document</title>');
  });

  it('rewrites the bundle URLs through asWebviewUri', () => {
    const html = render();

    expect(html).toContain('src="vscode-webview://test/ext/dist/main.js"');
    expect(html).toContain('href="vscode-webview://test/ext/dist/main.css"');
  });

  it('gives the entry script a nonce that matches the CSP', () => {
    const html = render();

    const scriptNonce = html.match(/<script nonce="([^"]+)"/)![1];
    expect(cspOf(html)).toContain(`'nonce-${scriptNonce}'`);
  });

  it('uses a fresh nonce on every render', () => {
    const first = render().match(/<script nonce="([^"]+)"/)![1];
    const second = render().match(/<script nonce="([^"]+)"/)![1];

    expect(first).not.toBe(second);
  });

  it('denies everything by default', () => {
    expect(cspOf(render())).toContain("default-src 'none'");
  });

  it('allows same-origin scripts for lazily imported chunks', () => {
    expect(cspOf(render())).toMatch(/script-src [^;]*vscode-webview:\/\/test/);
  });

  it("permits WebAssembly without granting general 'unsafe-eval'", () => {
    const csp = cspOf(render());

    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval' ");
  });

  it('allows fetching same-origin assets and https endpoints', () => {
    const connectSrc = cspOf(render())
      .split('; ')
      .find((directive) => directive.startsWith('connect-src'))!;

    expect(connectSrc).toContain('vscode-webview://test');
    expect(connectSrc).toContain('https:');
  });

  it('allows images and media from the webview origin, https, data and blob URLs', () => {
    const csp = cspOf(render());

    for (const directive of ['img-src', 'media-src']) {
      const value = csp.split('; ').find((d) => d.startsWith(directive))!;
      expect(value, directive).toContain('https:');
      expect(value, directive).toContain('data:');
      expect(value, directive).toContain('blob:');
    }
  });

  it('restricts embedded frames to https', () => {
    expect(cspOf(render())).toContain('frame-src https:');
  });
});

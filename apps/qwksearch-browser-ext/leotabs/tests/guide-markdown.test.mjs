
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderGuide} from '../scripts/guide-markdown.mjs';
test('guide renders steps, tables and code without executing markup',()=>{
  const html=renderGuide('# Setup\n\n1. Open **Settings**.\n2. Enter `sample`.\n\n| Field | Value |\n| --- | --- |\n| Parent | Example |\n\n```text\n<script>alert(1)</script>\n```');
  assert.match(html,/<ol>\s*<li>Open <strong>Settings<\/strong>\.<\/li>/);
  assert.match(html,/<th scope="col">Field<\/th>/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>/);
});
test('guide link resolver supports shared website routes and blocks unsafe protocols',()=>{
  assert.match(renderGuide('[Notion](notion.md)',()=> '../../docs/notion/'),/href="\.\.\/\.\.\/docs\/notion\/"/);
  assert.throws(()=>renderGuide('[unsafe](javascript:alert)'),/Unsafe guide link/);
  assert.throws(()=>renderGuide('```text\nunclosed'),/Unclosed/);
});
test('repeated headings get distinct fragment identifiers',()=>{
  assert.match(renderGuide('# Guide\n\n## Setup\n\n## Setup'),/id="setup-1"/);
});

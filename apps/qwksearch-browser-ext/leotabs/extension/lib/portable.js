
import {
  newCollection,
  uid,
  text,
  safeURL,
  validateCollections,
  validateSpaces,
  SCHEMA,
} from './model.js';
import { portableSettings } from './settings.js';
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const escapeMD = (s) =>
  String(s)
    .replace(/[\\\[\]*_`]/g, '\\$&')
    .replace(/\r?\n/g, ' ');
const unescapeMD = (s) => s.replace(/\\([\\\[\]*_`])/g, '$1');
const entity = (s) =>
  String(s).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[code.toLowerCase()];
  });
export function jsonExport(collections) {
  return JSON.stringify(
    { format: 'leotabs-collections', version: SCHEMA, exportedAt: new Date().toISOString(), collections },
    null,
    2,
  );
}
export function recoveryLog(records = []) {
  if (!Array.isArray(records) || records.length > 100)
    throw new Error('Backup exceeds the 100-entry recovery limit');
  return records.map((r) => ({
    id: uid(),
    at: Number(r.at) || Date.now(),
    label: text(r.label, 500),
    status: 'archived',
    originalStatus: text(r.originalStatus || r.status, 50),
  }));
}
export function backupExport(state, journal = []) {
  return JSON.stringify(
    {
      format: 'leotabs-backup',
      spaces: validateSpaces(state.spaces),
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: validateCollections(state.collections),
      settings: portableSettings(state.settings),
      recovery: recoveryLog((journal.length ? journal : state.importedHistory || []).slice(0, 100)),
    },
    null,
    2,
  );
}
export function markdownExport(collections) {
  return collections
    .map((c) => {
      const lines = [`# ${escapeMD(c.name)}`, '', c.note, ''];
      const render = (links) => {
        for (const l of links) {
          lines.push(`- [${escapeMD(l.title)}](<${l.url.replace(/>/g, '%3E')}>)`);
          if (l.note) lines.push(`  > ${l.note.replace(/\n/g, '\n  > ')}`);
        }
      };
      render(c.links.filter((l) => !l.groupId));
      for (const g of c.groups) {
        lines.push('', `## ${escapeMD(g.name)}`, '');
        render(c.links.filter((l) => l.groupId === g.id));
      }
      return lines.join('\n');
    })
    .join('\n\n');
}
export function htmlExport(collections) {
  const rows = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  const links = (items) => {
    for (const l of items) {
      rows.push(`<DT><A HREF="${escapeHTML(l.url)}">${escapeHTML(l.title)}</A>`);
      if (l.note) rows.push(`<DD>${escapeHTML(l.note)}`);
    }
  };
  for (const c of collections) {
    rows.push(`<DT><H3>${escapeHTML(c.name)}</H3>`);
    if (c.note) rows.push(`<DD>${escapeHTML(c.note)}`);
    rows.push('<DL><p>');
    links(c.links.filter((l) => !l.groupId));
    for (const g of c.groups) {
      rows.push(`<DT><H3>${escapeHTML(g.name)}</H3>`, '<DL><p>');
      links(c.links.filter((l) => l.groupId === g.id));
      rows.push('</DL><p>');
    }
    rows.push('</DL><p>');
  }
  return [...rows, '</DL><p>'].join('\n');
}
export function importBookmarkTree(tree) {
  const render = (node) =>
    node.url
      ? `<DT><A HREF="${escapeHTML(node.url)}">${escapeHTML(node.title || node.url)}</A>`
      : `${node.title ? `<DT><H3>${escapeHTML(node.title)}</H3>` : ''}<DL>${(node.children || []).map(render).join('\n')}</DL>`;
  return parseImport('<DL>' + tree.map(render).join('\n') + '</DL>', 'browser-bookmarks.html');
}
export function parseImport(source, filename = 'import.json') {
  if (typeof source !== 'string' || source.length > 20 * 1024 * 1024)
    throw new Error('Import must be a text file under 20 MB');
  const trimmed = source.trim();
  let collections = [],
    skipped = 0,
    settings,
    recovery,
    spaces;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data;
    try { data = JSON.parse(trimmed); }
    catch { throw new Error("Can't read this JSON file. Check the format or export it again."); }
    // Accept existing backups without migrating or rewriting the user's files.
    const isBackup = ['leotabs-backup', 'neo-backup'].includes(data.format);
    const isCollection = ['leotabs-collections', 'neo-tabs'].includes(data.format);
    if ((isBackup || isCollection) && data.version !== SCHEMA)
      throw new Error('This backup version is not supported');
    if (isBackup) {
      spaces = validateSpaces(data.spaces);
      collections = validateCollections(data.collections, { freshIds: true });
      settings = portableSettings(data.settings);
      recovery = recoveryLog(data.recovery || []);
    } else if (isCollection)
      collections = validateCollections(data.collections, { freshIds: true });
    else if (Array.isArray(data) && data.every((c) => Array.isArray(c.links)))
      collections = validateCollections(data, { freshIds: true });
    else if (
      Array.isArray(data.collections) &&
      data.collections.every((c) => Array.isArray(c.cards))
    ) {
      // Toby's portable collection/cards format; no source data is modified.
      collections = data.collections.map((c) => {
        const dest = newCollection(c.title || c.name);
        dest.links = (c.cards || []).flatMap((l) => {
          const url = safeURL(l.url);
          if (!url) {
            skipped++;
            return [];
          }
          return [
            {
              id: uid(),
              url,
              title: text(l.customTitle || l.title || url),
              note: text(l.description, 10000),
              groupId: null,
            },
          ];
        });
        return dest;
      });
    } else
      throw new Error(
        'Unrecognised JSON format. Choose a backup or supported collection export.',
      );
  } else if (/<(?:!DOCTYPE NETSCAPE|DL|H3|A\s)/i.test(trimmed)) {
    const stack = [];
    let pending = null,
      last = null,
      fallback = null;
    const tokens =
      trimmed.match(
        /<H3\b[^>]*>[\s\S]*?<\/H3>|<A\b[^>]*>[\s\S]*?<\/A>|<DD\b[^>]*>[\s\S]*?(?=<(?:DT|DL|\/DL|DD)\b|$)|<\/?DL\b[^>]*>/gi,
      ) || [];
    const clean = (s) => entity(s.replace(/<[^>]*>/g, '')).trim();
    for (const token of tokens) {
      if (/^<H3/i.test(token)) {
        pending = { name: clean(token), note: '' };
        last = null;
      } else if (/^<DL/i.test(token)) {
        stack.push(pending);
        pending = null;
        const path = stack.filter(Boolean);
        if (path.length) {
          const first = path[0];
          if (!first.collection) {
            first.collection = newCollection(first.name);
            first.collection.note = first.note;
            collections.push(first.collection);
          }
          if (path.length > 1) {
            const folder = path.at(-1);
            folder.group = {
              id: uid(),
              name: path
                .slice(1)
                .map((x) => x.name)
                .join(' / '),
              color: 'blue',
              collapsed: false,
            };
            first.collection.groups.push(folder.group);
          }
        }
      } else if (/^<\/DL/i.test(token)) stack.pop();
      else if (/^<A/i.test(token)) {
        const match = token.match(/\bHREF\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const url = safeURL(entity(match?.[1] || match?.[2] || match?.[3] || ''));
        if (!url) {
          skipped++;
          continue;
        }
        const path = stack.filter(Boolean);
        let c;
        if (path.length) {
          c = path[0].collection;
        } else {
          fallback ||= newCollection('Imported bookmarks');
          c = fallback;
          if (!collections.includes(c)) collections.push(c);
        }
        const groupName = path
          .slice(1)
          .map((x) => x.name)
          .join(' / ');
        let g = path.at(-1)?.group;
        if (groupName && !g) {
          g = { id: uid(), name: groupName, color: 'blue', collapsed: false };
          c.groups.push(g);
        }
        last = { id: uid(), url, title: clean(token) || url, note: '', groupId: g?.id || null };
        c.links.push(last);
      } else if (/^<DD/i.test(token)) {
        if (last) last.note = clean(token);
        else if (pending) pending.note = clean(token);
      }
    }
  } else {
    let c = newCollection(filename.replace(/\.[^.]+$/, '')),
      group = null,
      last = null;
    collections.push(c);
    for (const line of source.split(/\r?\n/)) {
      if (/^# /.test(line)) {
        if (c.links.length || c.note || c.groups.length) {
          c = newCollection(unescapeMD(line.slice(2)));
          collections.push(c);
        } else c.name = text(unescapeMD(line.slice(2)));
        group = null;
        last = null;
      } else if (/^## /.test(line)) {
        group = {
          id: uid(),
          name: text(unescapeMD(line.slice(3))),
          color: 'blue',
          collapsed: false,
        };
        c.groups.push(group);
        last = null;
      } else if (/^\s*>/.test(line) && last) {
        last.note += (last.note ? '\n' : '') + line.replace(/^\s*>\s?/, '');
      } else {
        const m =
          line.match(/^\s*[-*]\s+\[((?:\\.|[^\]])*)\]\(<?([^>\s]+)>\)/) ||
          line.match(/^\s*[-*]\s+\[((?:\\.|[^\]])*)\]\(([^\s)]+)\)/) ||
          line.match(/^(https?:\/\/\S+)\s*\|?\s*(.*)$/);
        if (m) {
          const isMD = /^\s*[-*]/.test(line);
          const url = safeURL(isMD ? m[2] : m[1]);
          if (!url) {
            skipped++;
            continue;
          }
          last = {
            id: uid(),
            title: text((isMD ? m[1] : m[2] || url).replace(/\\([\\\[\]*_`])/g, '$1')),
            url,
            note: '',
            groupId: group?.id || null,
          };
          c.links.push(last);
        } else if (line.trim() && !group) c.note += (c.note ? '\n' : '') + line;
      }
    }
  }
  collections = validateCollections(collections, { freshIds: true });
  if (!collections.length && !settings) throw new Error('No collections found in this file');
  return {
    collections,
    spaces,
    settings,
    recovery,
    skipped,
    links: collections.reduce((n, c) => n + c.links.length, 0),
  };
}

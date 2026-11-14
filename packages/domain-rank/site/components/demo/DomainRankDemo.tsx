'use client';

import { useMemo, useState } from 'react';
import { getTopDomains, lookupDomain, searchDomains } from 'domain-rank';

export function DomainRankDemo() {
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState('github.com');

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return getTopDomains(50);
    return searchDomains(q, 50);
  }, [query]);

  const lookedUp = useMemo(() => lookupDomain(lookup.trim()), [lookup]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-5 rounded-xl border border-fd-border bg-fd-card p-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="google, news, github.com..."
            className="rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm"
          />
          <span className="text-xs text-fd-muted-foreground">Searches domain, name, and title in the bundled dataset.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">Lookup exact domain</label>
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="example.com"
            className="rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm"
          />
          {lookedUp ? (
            <div className="rounded-md border border-fd-border bg-fd-background p-3 text-sm">
              <div className="font-medium">{lookedUp.name || lookedUp.domain}</div>
              <div className="text-fd-muted-foreground">{lookedUp.domain}</div>
              <div className="mt-1 font-mono text-xs">rank #{lookedUp.rank}</div>
              {lookedUp.title && <div className="mt-1 text-xs">{lookedUp.title}</div>}
            </div>
          ) : (
            <div className="text-xs text-fd-muted-foreground">No match in bundled dataset.</div>
          )}
        </div>
      </aside>

      <section className="rounded-xl border border-fd-border bg-fd-card">
        <div className="flex items-center justify-between border-b border-fd-border px-4 py-3">
          <h2 className="font-semibold">{query.trim() ? 'Search results' : 'Sample top domains'}</h2>
          <span className="text-sm text-fd-muted-foreground">{results.length} shown</span>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-fd-card text-left text-xs uppercase tracking-wide text-fd-muted-foreground">
              <tr>
                <th className="px-4 py-2">Rank</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Domain</th>
                <th className="px-4 py-2">Title</th>
              </tr>
            </thead>
            <tbody>
              {results.map((d) => (
                <tr key={d.domain} className="border-t border-fd-border/60 align-top">
                  <td className="px-4 py-2 font-mono text-xs">#{d.rank}</td>
                  <td className="px-4 py-2 font-medium">{d.name || '-'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-fd-muted-foreground">{d.domain}</td>
                  <td className="px-4 py-2 text-fd-muted-foreground">{d.title || '-'}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-fd-muted-foreground">No domains match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

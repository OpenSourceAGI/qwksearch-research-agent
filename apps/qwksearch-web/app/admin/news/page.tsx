"use client";

/**
 * @fileoverview Admin control of the homepage news widget: the site-wide
 * switch, the default topic list, how long an answer is cached, and the state
 * of the stored-article archive.
 *
 * Everything here is read and written through `/api/admin/news`, which holds
 * it in D1 — unlike Site Config, whose values are in-memory and per-isolate.
 */

import { useCallback, useEffect, useState } from "react";
import { TrendingNews, clearTrendingNewsCache } from "trending-news-api";

type Settings = {
  enabled: boolean;
  defaultTopics: string;
  allowUserTopics: boolean;
  maxTopics: number;
  showImages: boolean;
  cacheMinutes: number;
  retentionDays: number;
};

type Stats = {
  articleCount: number;
  topicCount: number;
  lastFetchedAt: string | null;
  topTopics: { topic: string; articleCount: number; lastFetchedAt: string | null }[];
};

type Payload = { settings: Settings; stats: Stats; apiKeyConfigured: boolean };

type Check = { name: string; ok: boolean; detail: string };

function when(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function AdminNewsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [checking, setChecking] = useState(false);
  // Bumped to remount the preview, so it refetches instead of showing the
  // browser's 10-minute cached answer.
  const [previewKey, setPreviewKey] = useState(0);

  const diagnose = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diagnose" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? `HTTP ${res.status}`);
      setChecks(payload.checks ?? []);
    } catch (e: any) {
      setChecks([{ name: "Health check", ok: false, detail: e.message }]);
    } finally {
      setChecking(false);
    }
    clearTrendingNewsCache();
    setPreviewKey((k) => k + 1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      const payload: Payload = await res.json();
      setData(payload);
      setDraft(payload.settings);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    diagnose();
  }, [load, diagnose]);

  async function post(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message ?? `HTTP ${res.status}`);
      return payload;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    const payload = await post({ ...draft }, "save");
    if (!payload) return;
    setData((prev) => (prev ? { ...prev, settings: payload.settings } : prev));
    // The server normalises what it stored (topics are canonicalised, numbers
    // clamped), so the form shows what was actually saved, not what was typed.
    setDraft(payload.settings);
    setNotice("Settings saved.");
    diagnose();
  }

  async function refresh() {
    const payload = await post({ action: "refresh" }, "refresh");
    if (!payload) return;
    if (payload.error) {
      setError(`Fetch failed: ${payload.error}`);
      return;
    }
    setData((prev) => (prev ? { ...prev, stats: payload.stats } : prev));
    setNotice(`Stored ${payload.stored} article(s) across ${payload.topics} topic(s).`);
  }

  async function prune() {
    const payload = await post({ action: "prune" }, "prune");
    if (!payload) return;
    setData((prev) => (prev ? { ...prev, stats: payload.stats } : prev));
    setNotice(`Removed ${payload.deleted} article(s) past the retention window.`);
  }

  async function clearAll() {
    if (!confirm("Delete every stored news article? The widget loses its offline fallback until the next fetch.")) {
      return;
    }
    setBusy("clear");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/news", { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message ?? `HTTP ${res.status}`);
      setData((prev) => (prev ? { ...prev, stats: payload.stats } : prev));
      setNotice(`Deleted ${payload.deleted} stored article(s).`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  function edit<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">News Widget</h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-sm font-mono">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 rounded text-sm">
          {notice}
        </div>
      )}

      {data && !data.apiKeyConfigured && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded text-sm">
          <code className="font-mono">THE_NEWS_API_KEY</code> is not set on this
          deployment, so no new headlines can be fetched. The widget falls back to
          whatever is already stored below.
        </div>
      )}

      {loading && !draft && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Diagnostics</h2>
          <button
            onClick={diagnose}
            disabled={checking}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Run check"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Each thing the homepage widget depends on, checked live. The widget
          hides itself on the homepage when any of these fail — this is why.
        </p>

        {checking && !checks && <div className="text-gray-400 text-sm">Checking…</div>}
        {checks && (
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.name} className="flex gap-2 text-sm">
                <span
                  aria-label={c.ok ? "OK" : "Failing"}
                  className={c.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                >
                  {c.ok ? "✓" : "✗"}
                </span>
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className={"block text-xs break-words " + (c.ok ? "text-gray-500" : "text-red-600 dark:text-red-400 font-mono")}>
                    {c.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1 pt-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Live preview of <code className="font-mono">/api/news/trending</code>
          </div>
          {/* Mounted after the first check, which clears the browser cache,
              so the preview shows what the endpoint answers now. */}
          {checks && (
            <TrendingNews
              key={previewKey}
              apiEndpoint="/api/news/trending"
              compact
              expandable
              showErrors
              maxTopics={data?.settings.maxTopics ?? 6}
              showImages={data?.settings.showImages ?? true}
              limit={15}
              className="rounded-lg w-full"
              style={{ border: "1px solid rgba(127,127,127,0.25)", maxWidth: "100%" }}
            />
          )}
        </div>
      </div>


      {draft && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-base">Widget</h2>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={draft.enabled}
              onChange={(e) => edit("enabled", e.target.checked)}
            />
            <span className="text-sm">
              Show the news widget on the homepage
              <span className="text-gray-500"> — off hides it for everyone</span>
            </span>
          </label>

          <Field
            label="Default topics"
            hint="Comma separated. These are the topics visitors see when they have not chosen their own. Leave blank to use Wikipedia's daily trending ranking."
          >
            <textarea
              rows={2}
              placeholder="artificial intelligence, climate, markets"
              className={inputClass + " resize-y"}
              value={draft.defaultTopics}
              onChange={(e) => edit("defaultTopics", e.target.value)}
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={draft.allowUserTopics}
              onChange={(e) => edit("allowUserTopics", e.target.checked)}
            />
            <span className="text-sm">
              Let each user set their own topics
              <span className="text-gray-500"> — in Settings → Search Settings</span>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={draft.showImages}
              onChange={(e) => edit("showImages", e.target.checked)}
            />
            <span className="text-sm">Show article thumbnails</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Topics shown" hint="1–20">
              <input
                type="number"
                min={1}
                max={20}
                className={inputClass}
                value={draft.maxTopics}
                onChange={(e) => edit("maxTopics", Number(e.target.value))}
              />
            </Field>
            <Field label="Cache (minutes)" hint="Each refresh costs one news search per topic.">
              <input
                type="number"
                min={1}
                max={1440}
                className={inputClass}
                value={draft.cacheMinutes}
                onChange={(e) => edit("cacheMinutes", Number(e.target.value))}
              />
            </Field>
            <Field label="Keep articles (days)" hint="How long stored headlines are retained.">
              <input
                type="number"
                min={1}
                max={365}
                className={inputClass}
                value={draft.retentionDays}
                onChange={(e) => edit("retentionDays", Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy !== null}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "save" ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}

      {data && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-base">Stored news</h2>
          <p className="text-xs text-gray-500">
            Headlines the widget has fetched, kept so the homepage still has
            something to show when The News API is unavailable.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              { label: "Articles", value: String(data.stats.articleCount) },
              { label: "Topics", value: String(data.stats.topicCount) },
              { label: "Last fetched", value: when(data.stats.lastFetchedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded px-3 py-2">
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="font-mono text-xs break-all">{value}</div>
              </div>
            ))}
          </div>

          {data.stats.topTopics.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-1 pr-3 font-medium">Topic</th>
                    <th className="py-1 pr-3 font-medium">Articles</th>
                    <th className="py-1 font-medium">Last fetched</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.topTopics.map((t) => (
                    <tr key={t.topic} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1.5 pr-3 font-semibold">{t.topic}</td>
                      <td className="py-1.5 pr-3">{t.articleCount}</td>
                      <td className="py-1.5 text-gray-500">{when(t.lastFetchedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={refresh}
              disabled={busy !== null}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "refresh" ? "Fetching…" : "Fetch & store now"}
            </button>
            <button
              onClick={prune}
              disabled={busy !== null}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {busy === "prune" ? "Pruning…" : `Prune older than ${data.settings.retentionDays}d`}
            </button>
            <button
              onClick={clearAll}
              disabled={busy !== null}
              className="px-3 py-1.5 text-sm rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
            >
              {busy === "clear" ? "Clearing…" : "Clear stored news"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * @fileoverview Admin control of the `/api/*` rate limiter: the site-wide
 * switch, the default limit, per-route overrides, exempt paths, and the
 * clients currently being counted.
 *
 * Everything here is read and written through `/api/admin/rate-limit`, which
 * holds it in D1 — unlike Site Config, whose values are in-memory and
 * per-isolate. The limiter itself runs in `worker/index.ts`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_API_RATE_LIMIT_SETTINGS,
  resolveRateLimitRule,
  type ApiRateLimitSettings,
  type RateLimitOverride,
} from "@/lib/rate-limit/api-rules";

type Bucket = {
  bucket: string;
  clientKey: string;
  rule: string;
  windowStart: number;
  count: number;
  expiresAt: number;
};

type Activity = { buckets: Bucket[]; openWindows: number; error: string | null };

type Payload = {
  settings: ApiRateLimitSettings;
  activity: Activity;
  settingsCacheSeconds: number;
  now: number;
};

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
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

const secondaryButton =
  "px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50";

/** "60 s", "5 min", "1 h" — whichever reads naturally. */
function describeWindow(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

function cloneSettings(settings: ApiRateLimitSettings): ApiRateLimitSettings {
  return { ...settings, overrides: settings.overrides.map((o) => ({ ...o })) };
}

export default function AdminRateLimitPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<ApiRateLimitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testPath, setTestPath] = useState("/api/agent/chat");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rate-limit");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setData(body as Payload);
      setDraft(cloneSettings((body as Payload).settings));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? `HTTP ${res.status}`);
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
    // The server normalises what it stored (patterns canonicalised, numbers
    // clamped, blank rows dropped), so show what was actually saved.
    setDraft(cloneSettings(payload.settings));
    setNotice(
      `Saved. Every server picks it up within ${data?.settingsCacheSeconds ?? 15} seconds.`,
    );
  }

  async function reset(bucket?: string) {
    if (!bucket && !confirm("Clear every counter? Every client starts a fresh window.")) return;
    const payload = await post(bucket ? { action: "reset", bucket } : { action: "reset" }, bucket ?? "reset-all");
    if (!payload) return;
    setData((prev) => (prev ? { ...prev, activity: payload.activity } : prev));
    setNotice(bucket ? "Counter cleared — that client can make requests again." : `Cleared ${payload.deleted} counter(s).`);
  }

  function edit<K extends keyof ApiRateLimitSettings>(key: K, value: ApiRateLimitSettings[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function editOverride(index: number, patch: Partial<RateLimitOverride>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            overrides: prev.overrides.map((o, i) => (i === index ? { ...o, ...patch } : o)),
          }
        : prev,
    );
  }

  function addOverride() {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            overrides: [...prev.overrides, { pattern: "", limit: 60, windowSeconds: prev.windowSeconds }],
          }
        : prev,
    );
  }

  function removeOverride(index: number) {
    setDraft((prev) =>
      prev ? { ...prev, overrides: prev.overrides.filter((_, i) => i !== index) } : prev,
    );
  }

  function moveOverride(index: number, delta: -1 | 1) {
    setDraft((prev) => {
      if (!prev) return prev;
      const target = index + delta;
      if (target < 0 || target >= prev.overrides.length) return prev;
      const overrides = [...prev.overrides];
      [overrides[index], overrides[target]] = [overrides[target], overrides[index]];
      return { ...prev, overrides };
    });
  }

  const dirty = useMemo(
    () => Boolean(data && draft && JSON.stringify(data.settings) !== JSON.stringify(draft)),
    [data, draft],
  );

  // Uses the same matcher as the Worker, against the unsaved draft, so an
  // admin can check a pattern before saving it.
  const testResult = useMemo(() => {
    if (!draft || !testPath.trim()) return null;
    const path = testPath.trim().startsWith("/") ? testPath.trim() : `/${testPath.trim()}`;
    const rule = resolveRateLimitRule(draft, path.split("?")[0]);
    if (!draft.enabled) return "The limiter is off — nothing is counted.";
    if (!rule) return "Not under /api — the limiter never sees it.";
    if (rule.kind === "exempt") return `Exempt (matches ${rule.pattern}) — never counted.`;
    const where = rule.kind === "override" ? `override ${rule.pattern}` : "the default limit";
    return `${rule.limit} requests per ${describeWindow(rule.windowSeconds)} per client, from ${where}.`;
  }, [draft, testPath]);

  function limitFor(rule: string): number | null {
    const settings = data?.settings;
    if (!settings) return null;
    if (rule === "default") return settings.requestsPerWindow;
    return settings.overrides.find((o) => o.pattern === rule)?.limit ?? null;
  }

  const nowSeconds = data?.now ?? Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">API Rate Limits</h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Every request to <code className="font-mono">/api/*</code> is counted per client IP
        before it reaches the app. A client over its limit gets a{" "}
        <code className="font-mono">429</code> with a <code className="font-mono">Retry-After</code>{" "}
        header until the window ends. Route-specific quotas (guest chat, text-to-speech) still
        apply on top.
      </p>

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

      {loading && !draft && <div className="text-gray-400 text-sm">Loading…</div>}

      {draft && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-5">
          <h2 className="font-semibold text-base">Limits</h2>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={draft.enabled}
              onChange={(e) => edit("enabled", e.target.checked)}
            />
            <span className="text-sm">
              Rate-limit API requests
              <span className="text-gray-500"> — off lets every request through uncounted</span>
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Default limit (requests)" hint="Per client, for every route without an override.">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={draft.requestsPerWindow}
                onChange={(e) => edit("requestsPerWindow", Number(e.target.value))}
              />
            </Field>
            <Field label="Window (seconds)" hint={`60 = per minute, 3600 = per hour. Now: ${describeWindow(draft.windowSeconds)}.`}>
              <input
                type="number"
                min={1}
                max={86400}
                className={inputClass}
                value={draft.windowSeconds}
                onChange={(e) => edit("windowSeconds", Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Route overrides</div>
            <p className="text-xs text-gray-500">
              A tighter or looser limit for matching routes, counted separately from the default.
              <code className="font-mono"> *</code> matches anything; a trailing{" "}
              <code className="font-mono">/*</code> also matches the path itself. The first match
              from the top wins.
            </p>
            {draft.overrides.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-1 pr-2 font-medium">Path pattern</th>
                      <th className="py-1 pr-2 font-medium w-28">Requests</th>
                      <th className="py-1 pr-2 font-medium w-28">Window (s)</th>
                      <th className="py-1 font-medium w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.overrides.map((o, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-1.5 pr-2">
                          <input
                            className={inputClass + " font-mono"}
                            placeholder="/api/agent/*"
                            value={o.pattern}
                            onChange={(e) => editOverride(i, { pattern: e.target.value })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min={1}
                            className={inputClass}
                            value={o.limit}
                            onChange={(e) => editOverride(i, { limit: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min={1}
                            max={86400}
                            className={inputClass}
                            value={o.windowSeconds}
                            onChange={(e) => editOverride(i, { windowSeconds: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5 whitespace-nowrap text-right space-x-1">
                          <button
                            onClick={() => moveOverride(i, -1)}
                            disabled={i === 0}
                            aria-label="Move up"
                            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveOverride(i, 1)}
                            disabled={i === draft.overrides.length - 1}
                            aria-label="Move down"
                            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeOverride(i)}
                            className="px-2 py-1 text-xs rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={addOverride} className={secondaryButton}>
              + Add override
            </button>
          </div>

          <Field
            label="Exempt paths"
            hint="One pattern per line. These are never counted. Keep /api/admin/* here so a limit set too tight can't lock you out of this page."
          >
            <textarea
              rows={4}
              className={inputClass + " font-mono resize-y"}
              value={draft.exemptPaths}
              onChange={(e) => edit("exemptPaths", e.target.value)}
            />
          </Field>

          <Field label="Check a path" hint="Which rule a request would fall under, using the settings above (saved or not).">
            <input
              className={inputClass + " font-mono"}
              value={testPath}
              onChange={(e) => setTestPath(e.target.value)}
            />
            {testResult && <p className="text-xs text-gray-600 dark:text-gray-400 pt-1">{testResult}</p>}
          </Field>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={save}
              disabled={busy !== null || !dirty}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "save" ? "Saving…" : "Save settings"}
            </button>
            <button
              onClick={() => setDraft(cloneSettings(DEFAULT_API_RATE_LIMIT_SETTINGS))}
              disabled={busy !== null}
              className={secondaryButton}
            >
              Restore defaults
            </button>
            {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
          </div>
        </div>
      )}

      {data && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Current activity</h2>
            <button onClick={() => reset()} disabled={busy !== null} className={secondaryButton}>
              {busy === "reset-all" ? "Clearing…" : "Reset all counters"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            The busiest clients in their current window. {data.activity.openWindows} window(s) open.
            Resetting a row lets that client make requests again immediately.
          </p>

          {data.activity.error && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded text-sm">
              Counters could not be read: <span className="font-mono">{data.activity.error}</span>. If the
              table is missing, apply the D1 migrations (<code className="font-mono">bun run db:migrate</code>);
              until then the limiter lets every request through.
            </div>
          )}

          {data.activity.buckets.length === 0 && !data.activity.error && (
            <div className="text-sm text-gray-400">No API requests counted in the current window.</div>
          )}

          {data.activity.buckets.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-1 pr-3 font-medium">Client</th>
                    <th className="py-1 pr-3 font-medium">Rule</th>
                    <th className="py-1 pr-3 font-medium">Requests</th>
                    <th className="py-1 pr-3 font-medium">Resets in</th>
                    <th className="py-1 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.activity.buckets.map((b) => {
                    const limit = limitFor(b.rule);
                    const over = limit !== null && b.count > limit;
                    return (
                      <tr key={b.bucket + b.windowStart} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-1.5 pr-3 font-mono">{b.clientKey}</td>
                        <td className="py-1.5 pr-3 font-mono">{b.rule}</td>
                        <td className={"py-1.5 pr-3 " + (over ? "text-red-600 dark:text-red-400 font-semibold" : "")}>
                          {b.count}
                          {limit !== null && <span className="text-gray-500"> / {limit}</span>}
                          {over && " — blocked"}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-500">
                          {describeWindow(Math.max(1, b.expiresAt - nowSeconds))}
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() => reset(b.bucket)}
                            disabled={busy !== null}
                            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                          >
                            {busy === b.bucket ? "…" : "Reset"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

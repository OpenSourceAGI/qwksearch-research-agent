"use client";

import { useEffect, useState } from "react";

interface ModelEntry {
  id: string;
  name: string;
  contextLength: number;
}

interface LiveTest {
  model?: string;
  ok?: boolean;
  status?: number;
  error?: string;
  ms?: number;
  skipped?: boolean;
  reason?: string;
}

interface KeySourceReport {
  set: boolean;
  masked: string | null;
  sources: {
    cloudflareEnv: boolean;
    processEnv: boolean;
  };
}

interface ProviderData {
  key: KeySourceReport;
  keyConfigured: boolean;
  keyMasked: string | null;
  baseUrl: string;
  freeModelCount: number;
  freeModels: ModelEntry[];
  liveTest: LiveTest;
}

interface ModelTestResult {
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
  ms: number;
  existsUpstream?: boolean;
}

interface TestAllResult {
  upstreamModelsFetched?: boolean;
  results?: ModelTestResult[];
  error?: string;
}

interface FreeKeysData {
  nvidia: ProviderData;
  openrouter: ProviderData;
  guestProviders: {
    note: string;
    providers: { name: string; type: string; modelCount: number }[];
    error: string | null;
  };
  guestLogic: {
    note: string;
    openrouterKeySet: boolean;
    nvidiaWillBeLoaded: boolean;
    openrouterWillBeLoaded: boolean;
  };
  auth: {
    betterAuthSecretSet: boolean;
    googleOAuthConfigured: boolean;
    baseUrlEnv: string | null;
    session: {
      signedIn: boolean;
      email?: string;
      userId?: string;
      error?: string;
    };
    note: string;
  };
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        ok
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      }`}
    >
      {label ?? (ok ? "OK" : "FAIL")}
    </span>
  );
}

function ProviderCard({
  name,
  slug,
  data,
}: {
  name: string;
  slug: "nvidia" | "openrouter";
  data: ProviderData;
}) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestAllResult | null>(null);

  async function runTestAll() {
    setTesting(true);
    setTestResults(null);
    try {
      const res = await fetch(`/api/admin/freekeys?testAll=${slug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTestResults(json[slug] ?? { error: "no data returned" });
    } catch (e: any) {
      setTestResults({ error: e.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{name}</h2>
        <StatusBadge ok={data.keyConfigured} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-500 dark:text-gray-400">API key</div>
        <div className="font-mono">
          {data.keyConfigured ? (
            <span className="text-green-600 dark:text-green-400">
              {data.keyMasked}
            </span>
          ) : (
            <span className="text-red-500">not set</span>
          )}
        </div>

        <div className="text-gray-500 dark:text-gray-400">
          Visible via cloudflare:workers env
        </div>
        <div>
          <StatusBadge
            ok={data.key?.sources?.cloudflareEnv ?? false}
            label={data.key?.sources?.cloudflareEnv ? "YES" : "NO"}
          />
        </div>

        <div className="text-gray-500 dark:text-gray-400">
          Visible via process.env
        </div>
        <div>
          <StatusBadge
            ok={data.key?.sources?.processEnv ?? false}
            label={data.key?.sources?.processEnv ? "YES" : "NO"}
          />
        </div>

        <div className="text-gray-500 dark:text-gray-400">Base URL</div>
        <div className="font-mono text-xs break-all">{data.baseUrl}</div>

        <div className="text-gray-500 dark:text-gray-400">Free models in DB</div>
        <div>{data.freeModelCount}</div>

        <div className="text-gray-500 dark:text-gray-400">Live test</div>
        <div>
          {data.liveTest.skipped ? (
            <span className="text-gray-400 text-xs">{data.liveTest.reason}</span>
          ) : (
            <span className="text-xs space-x-2">
              <StatusBadge ok={!!data.liveTest.ok} />
              <span className="text-gray-500">{data.liveTest.ms}ms</span>
              {data.liveTest.status && (
                <span className="text-gray-500">HTTP {data.liveTest.status}</span>
              )}
              {data.liveTest.model && (
                <span className="font-mono text-gray-400">{data.liveTest.model}</span>
              )}
            </span>
          )}
          {data.liveTest.error && (
            <div className="mt-1 text-red-500 text-xs font-mono bg-red-50 dark:bg-red-950 p-1 rounded">
              {data.liveTest.error}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-blue-500 hover:underline"
        >
          {expanded ? "Hide" : "Show"} {data.freeModelCount} free models
        </button>
        <button
          onClick={runTestAll}
          disabled={testing || !data.keyConfigured}
          className="text-sm px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          title={
            data.keyConfigured
              ? "Send a 1-token test prompt to every free model"
              : "Set the API key first"
          }
        >
          {testing ? "Testing all models…" : "Test all models"}
        </button>
      </div>

      {testResults?.error && (
        <div className="text-red-500 text-xs font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
          {testResults.error}
        </div>
      )}

      {testResults?.results && (
        <div>
          <div className="text-xs text-gray-500 mb-1">
            {testResults.results.filter((r) => r.ok).length} /{" "}
            {testResults.results.length} models responded OK
            {testResults.upstreamModelsFetched === false &&
              " (provider /models list unavailable — upstream check skipped)"}
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-1 pr-2">Model ID</th>
                <th className="py-1 pr-2">Result</th>
                <th className="py-1 pr-2">Listed upstream</th>
                <th className="py-1 pr-2">Time</th>
                <th className="py-1">Error</th>
              </tr>
            </thead>
            <tbody>
              {testResults.results.map((r) => (
                <tr
                  key={r.model}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-1 pr-2 font-mono text-gray-700 dark:text-gray-300">
                    {r.model}
                  </td>
                  <td className="py-1 pr-2">
                    <StatusBadge ok={r.ok} />
                    {r.status ? (
                      <span className="ml-1 text-gray-400">HTTP {r.status}</span>
                    ) : null}
                  </td>
                  <td className="py-1 pr-2">
                    {r.existsUpstream === undefined
                      ? "—"
                      : r.existsUpstream
                        ? "yes"
                        : "NO"}
                  </td>
                  <td className="py-1 pr-2 text-gray-500">{r.ms}ms</td>
                  <td className="py-1 text-red-500 font-mono break-all">
                    {r.error?.slice(0, 120)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && (
        <table className="mt-2 w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-1 pr-2">Model ID</th>
              <th className="py-1 pr-2">Name</th>
              <th className="py-1">Context</th>
            </tr>
          </thead>
          <tbody>
            {data.freeModels.map((m) => (
              <tr
                key={m.id}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="py-1 pr-2 font-mono text-gray-700 dark:text-gray-300">
                  {m.id}
                </td>
                <td className="py-1 pr-2 text-gray-600 dark:text-gray-400">
                  {m.name}
                </td>
                <td className="py-1 text-gray-500">
                  {m.contextLength?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function FreeKeysPage() {
  const [data, setData] = useState<FreeKeysData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/freekeys");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Free Keys Debug</h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded font-mono text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-gray-400 text-sm">Testing API keys and models…</div>
      )}

      {data && (
        <div className="space-y-4">
          {/* What guests actually see — ground truth from the providers API */}
          <div
            className={`border rounded-lg p-4 text-sm space-y-2 ${
              data.guestProviders.providers.length > 0
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Providers loaded for guests ({data.guestProviders.providers.length})
              </h2>
              <StatusBadge ok={data.guestProviders.providers.length > 0} />
            </div>
            {data.guestProviders.providers.length > 0 ? (
              <ul className="text-xs space-y-1">
                {data.guestProviders.providers.map((p) => (
                  <li key={p.name} className="font-mono">
                    {p.name} ({p.type}) — {p.modelCount} models
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400">
                No providers loaded — guests see an empty model list. Check the
                per-provider key visibility below.
              </p>
            )}
            {data.guestProviders.error && (
              <p className="text-xs text-red-500 font-mono">
                {data.guestProviders.error}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.guestProviders.note}
            </p>
          </div>

          <ProviderCard name="NVIDIA" slug="nvidia" data={data.nvidia} />
          <ProviderCard name="OpenRouter" slug="openrouter" data={data.openrouter} />

          <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950 text-sm space-y-2">
            <h2 className="font-semibold text-yellow-800 dark:text-yellow-200">
              Guest Logic
            </h2>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-gray-600 dark:text-gray-400">OpenRouter key set</span>
              <StatusBadge ok={data.guestLogic.openrouterKeySet} />
              <span className="text-gray-600 dark:text-gray-400">NVIDIA will be loaded for guests</span>
              <StatusBadge ok={data.guestLogic.nvidiaWillBeLoaded} />
              <span className="text-gray-600 dark:text-gray-400">OpenRouter will be loaded for guests</span>
              <StatusBadge ok={data.guestLogic.openrouterWillBeLoaded} />
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-2">
              {data.guestLogic.note}
            </p>
          </div>

          <div
            className={`border rounded-lg p-4 text-sm space-y-2 ${
              data.auth.betterAuthSecretSet
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2
                className={`font-semibold ${
                  data.auth.betterAuthSecretSet
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                Auth
              </h2>
              <StatusBadge ok={data.auth.betterAuthSecretSet} />
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                BETTER_AUTH_SECRET set
              </span>
              <StatusBadge ok={data.auth.betterAuthSecretSet} />
              <span className="text-gray-600 dark:text-gray-400">
                Google OAuth configured
              </span>
              <StatusBadge ok={data.auth.googleOAuthConfigured} />
              <span className="text-gray-600 dark:text-gray-400">
                NEXT_PUBLIC_BASE_URL
              </span>
              <span className="font-mono">{data.auth.baseUrlEnv ?? "not set"}</span>
              <span className="text-gray-600 dark:text-gray-400">
                This request's session
              </span>
              <span>
                <StatusBadge
                  ok={data.auth.session.signedIn}
                  label={data.auth.session.signedIn ? "SIGNED IN" : "GUEST"}
                />
                {data.auth.session.email && (
                  <span className="ml-2 font-mono">{data.auth.session.email}</span>
                )}
              </span>
            </div>
            {data.auth.session.error && (
              <p className="text-xs text-red-500 font-mono">
                session error: {data.auth.session.error}
              </p>
            )}
            <p
              className={`text-xs mt-1 ${
                data.auth.betterAuthSecretSet
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {data.auth.note}
            </p>
            {!data.auth.betterAuthSecretSet && (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono bg-red-100 dark:bg-red-900 p-2 rounded mt-2">
                Fix: In CF Workers dashboard → Settings → Variables → add{" "}
                <strong>BETTER_AUTH_SECRET</strong> = (any long random string, e.g. 32+ chars)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

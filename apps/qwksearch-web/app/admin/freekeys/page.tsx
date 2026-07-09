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

interface ProviderData {
  keyConfigured: boolean;
  keyMasked: string | null;
  baseUrl: string;
  freeModelCount: number;
  freeModels: ModelEntry[];
  liveTest: LiveTest;
}

interface FreeKeysData {
  nvidia: ProviderData;
  openrouter: ProviderData;
  guestLogic: {
    note: string;
    openrouterKeySet: boolean;
    nvidiaWillBeLoaded: boolean;
    openrouterWillBeLoaded: boolean;
  };
  auth: {
    betterAuthSecretSet: boolean;
    note: string;
  };
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        ok
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      }`}
    >
      {ok ? "OK" : "FAIL"}
    </span>
  );
}

function ProviderCard({
  name,
  data,
}: {
  name: string;
  data: ProviderData;
}) {
  const [expanded, setExpanded] = useState(false);

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

      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-blue-500 hover:underline"
        >
          {expanded ? "Hide" : "Show"} {data.freeModelCount} free models
        </button>
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
          <ProviderCard name="NVIDIA" data={data.nvidia} />
          <ProviderCard name="OpenRouter" data={data.openrouter} />

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

          <div className={`border rounded-lg p-4 text-sm space-y-2 ${data.auth.betterAuthSecretSet ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"}`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-semibold ${data.auth.betterAuthSecretSet ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                Auth Secret (BETTER_AUTH_SECRET)
              </h2>
              <StatusBadge ok={data.auth.betterAuthSecretSet} />
            </div>
            <p className={`text-xs mt-1 ${data.auth.betterAuthSecretSet ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
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

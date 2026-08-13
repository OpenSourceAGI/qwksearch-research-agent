"use client";

import { useEffect, useState } from "react";
import {
  APP_NAME,
  NEXT_PUBLIC_BASE_URL,
  APP_EMAIL,
  LAST_REVISED_DATE,
  SubscriptionPlans,
} from "@/lib/config/site";

interface ConfigField {
  name: string;
  key: string;
  type: string;
  description?: string;
  placeholder?: string;
  default?: any;
  scope?: string;
  env?: string;
  options?: { name: string; value: string }[];
}

interface ConfigSection {
  name?: string;
  key?: string;
  fields?: ConfigField[];
  [key: string]: any;
}

interface ConfigResponse {
  values: Record<string, any>;
  fields: {
    preferences: ConfigField[];
    search: ConfigField[];
    modelProviders: ConfigSection[];
    mcpServers: ConfigSection[];
  };
}

function fieldValue(values: Record<string, any>, section: string, key: string): string {
  return String(values?.[section]?.[key] ?? "");
}

function SectionCard({
  title,
  fields,
  sectionKey,
  values,
  onSave,
}: {
  title: string;
  fields: ConfigField[];
  sectionKey: string;
  values: Record<string, any>;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function currentVal(f: ConfigField): string {
    return editing[f.key] !== undefined
      ? editing[f.key]
      : fieldValue(values, sectionKey, f.key);
  }

  async function save(f: ConfigField) {
    const val = currentVal(f);
    setSaving((s) => ({ ...s, [f.key]: true }));
    setErrors((e) => ({ ...e, [f.key]: "" }));
    try {
      await onSave(`${sectionKey}.${f.key}`, val);
      setSaved((s) => ({ ...s, [f.key]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [f.key]: false })), 1500);
    } catch (e: any) {
      setErrors((err) => ({ ...err, [f.key]: e.message }));
    } finally {
      setSaving((s) => ({ ...s, [f.key]: false }));
    }
  }

  const serverFields = fields.filter((f) => f.scope === "server" || !f.scope);
  if (serverFields.length === 0) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <h2 className="font-semibold text-base">{title}</h2>
      {serverFields.map((f) => (
        <div key={f.key} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {f.name}
              {f.env && (
                <span className="ml-2 font-mono text-gray-400 text-[10px]">
                  env: {f.env}
                </span>
              )}
            </label>
            {saved[f.key] && (
              <span className="text-xs text-green-600 dark:text-green-400">Saved</span>
            )}
          </div>
          {f.description && (
            <p className="text-xs text-gray-500">{f.description}</p>
          )}
          <div className="flex gap-2">
            {f.type === "select" ? (
              <select
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentVal(f)}
                onChange={(e) =>
                  setEditing((ed) => ({ ...ed, [f.key]: e.target.value }))
                }
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : f.type === "password" ? (
              <input
                type="password"
                autoComplete="off"
                placeholder={f.placeholder ?? ""}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentVal(f)}
                onChange={(e) =>
                  setEditing((ed) => ({ ...ed, [f.key]: e.target.value }))
                }
              />
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                placeholder={f.placeholder ?? ""}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                value={currentVal(f)}
                onChange={(e) =>
                  setEditing((ed) => ({ ...ed, [f.key]: e.target.value }))
                }
              />
            ) : f.type === "switch" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded"
                  checked={currentVal(f) === "true"}
                  onChange={(e) =>
                    setEditing((ed) => ({
                      ...ed,
                      [f.key]: e.target.checked ? "true" : "false",
                    }))
                  }
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentVal(f) === "true" ? "On" : "Off"}
                </span>
              </label>
            ) : (
              <input
                type="text"
                placeholder={f.placeholder ?? ""}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentVal(f)}
                onChange={(e) =>
                  setEditing((ed) => ({ ...ed, [f.key]: e.target.value }))
                }
              />
            )}
            <button
              onClick={() => save(f)}
              disabled={saving[f.key]}
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {saving[f.key] ? "…" : "Save"}
            </button>
          </div>
          {errors[f.key] && (
            <p className="text-xs text-red-500 font-mono">{errors[f.key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfig(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(key: string, value: string) {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    setConfig((prev) => {
      if (!prev) return prev;
      const parts = key.split(".");
      const updated = JSON.parse(JSON.stringify(prev.values));
      let target = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return { ...prev, values: updated };
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Site Config</h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Read-only site constants */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-base">Site Variables</h2>
        <p className="text-xs text-gray-500">
          Read-only constants from{" "}
          <code className="font-mono">lib/config/site.ts</code>. Edit the source
          file or set environment variables to change these.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "App Name", value: APP_NAME },
            { label: "Base URL", value: NEXT_PUBLIC_BASE_URL },
            { label: "Support Email", value: APP_EMAIL },
            { label: "Terms Last Revised", value: LAST_REVISED_DATE },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded px-3 py-2">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className="font-mono text-xs break-all">{value}</div>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-medium mt-2">Subscription Plans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-1 pr-3 font-medium">Plan</th>
                <th className="py-1 pr-3 font-medium">Price/mo</th>
                <th className="py-1 pr-3 font-medium">Stripe URL</th>
                <th className="py-1 font-medium">Features</th>
              </tr>
            </thead>
            <tbody>
              {SubscriptionPlans.map((p) => (
                <tr
                  key={p.name}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-1.5 pr-3 font-semibold">{p.name}</td>
                  <td className="py-1.5 pr-3">${p.price}</td>
                  <td className="py-1.5 pr-3 font-mono text-gray-500 break-all max-w-[180px]">
                    {p.url === "#" ? "—" : p.url}
                  </td>
                  <td className="py-1.5 text-gray-500">
                    {p.features.map((f) => f.text).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-sm font-mono">
          {error}
        </div>
      )}

      {loading && !config && (
        <div className="text-gray-400 text-sm">Loading config…</div>
      )}

      {config && (
        <>
          <SectionCard
            title="Search Settings"
            fields={config.fields.search}
            sectionKey="search"
            values={config.values}
            onSave={saveConfig}
          />

          {config.fields.modelProviders.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-base">Model Providers</h2>
              <p className="text-xs text-gray-500">
                Configured via environment variables. Set the corresponding env var
                to enable a provider.
              </p>
              {config.fields.modelProviders.map((section: any) => (
                <div
                  key={section.key}
                  className="border-t border-gray-100 dark:border-gray-800 pt-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{section.name}</span>
                    <span className="text-xs font-mono text-gray-400">
                      {section.key}
                    </span>
                  </div>
                  {section.fields?.map((f: ConfigField) => (
                    <div key={f.key} className="text-xs text-gray-500 ml-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {f.name}
                      </span>
                      {f.env && (
                        <span className="ml-2 font-mono text-gray-400">
                          env: {f.env}
                        </span>
                      )}
                      {f.required && (
                        <span className="ml-1 text-red-400">required</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {config.fields.mcpServers.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              <h2 className="font-semibold text-base">MCP Servers</h2>
              {config.fields.mcpServers.map((section: any) => (
                <div
                  key={section.key}
                  className="text-xs border-t border-gray-100 dark:border-gray-800 pt-2"
                >
                  <span className="font-medium">{section.name}</span>
                  <span className="ml-2 font-mono text-gray-400">{section.key}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

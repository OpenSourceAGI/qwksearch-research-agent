"use client";

import { useEffect, useRef, useState } from "react";
import { SubscriptionPlans } from "@/lib/config/site";

interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  trialAllowed: number;
  apiKey: string | null;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string | number;
  updatedAt: string | number;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function fmtBytes(b: number) {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

function fmtDate(v: string | number | null | undefined) {
  if (!v) return "—";
  const d = new Date(typeof v === "number" ? v * 1000 : v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

function guessPlan(u: UserRow): string {
  const gb = u.storageQuotaBytes / 1073741824;
  if (gb >= 50) return "Team";
  if (gb > 1) return "Pro";
  return "Free";
}

function PlanBadge({ plan }: { plan: string }) {
  const color =
    plan === "Team"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      : plan === "Pro"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {plan}
    </span>
  );
}

function EditModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: (updated: UserRow) => void;
}) {
  const [name, setName] = useState(user.name);
  const [trialAllowed, setTrialAllowed] = useState(String(user.trialAllowed));
  const [storageGB, setStorageGB] = useState(
    String((user.storageQuotaBytes / 1073741824).toFixed(1)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          trialAllowed: parseInt(trialAllowed, 10),
          storageQuotaBytes: Math.round(parseFloat(storageGB) * 1073741824),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const { user: updated } = await res.json();
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      onSaved({ ...user, id: "__deleted__" });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Edit User</h2>

        <div className="text-xs text-gray-500 font-mono break-all">{user.id}</div>
        <div className="text-sm">{user.email}</div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Display name
            </span>
            <input
              className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Trial queries remaining
            </span>
            <input
              type="number"
              min="0"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={trialAllowed}
              onChange={(e) => setTrialAllowed(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Storage quota (GB)
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={storageGB}
              onChange={(e) => setStorageGB(e.target.value)}
            />
            <span className="text-xs text-gray-400 mt-1 block">
              Used: {fmtBytes(user.storageUsedBytes)}
            </span>
          </label>
        </div>

        {error && (
          <div className="text-red-500 text-xs font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Delete user
              </button>
            ) : (
              <span className="text-xs">
                Sure?{" "}
                <button
                  onClick={deleteUser}
                  disabled={saving}
                  className="text-red-600 font-semibold underline"
                >
                  Yes, delete
                </button>{" "}
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-gray-500 underline"
                >
                  Cancel
                </button>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearch(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(v);
      setPage(1);
    }, 300);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(debouncedQ ? { q: debouncedQ } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, debouncedQ]);

  function onSaved(updated: UserRow) {
    if (!data) return;
    if (updated.id === "__deleted__") {
      setData({
        ...data,
        users: data.users.filter((u) => u.id !== editing?.id),
        total: data.total - 1,
      });
    } else {
      setData({
        ...data,
        users: data.users.map((u) => (u.id === updated.id ? updated : u)),
      });
    }
  }

  const planCounts = data
    ? data.users.reduce<Record<string, number>>((acc, u) => {
        const p = guessPlan(u);
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Users</h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Subscription summary */}
      <div className="flex gap-4 flex-wrap">
        {SubscriptionPlans.map((plan) => (
          <div
            key={plan.name}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-center min-w-[90px]"
          >
            <div className="text-2xl font-bold">{planCounts[plan.name] ?? 0}</div>
            <div className="text-xs text-gray-500">{plan.name}</div>
            <div className="text-xs text-gray-400">${plan.price}/mo</div>
          </div>
        ))}
        {data && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-center min-w-[90px]">
            <div className="text-2xl font-bold">{data.total}</div>
            <div className="text-xs text-gray-500">Total users</div>
          </div>
        )}
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search by name, email, or ID…"
        value={q}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-sm font-mono">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Trial left</th>
              <th className="px-3 py-2 font-medium">Storage</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Verified</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400 text-xs">
                  Loading…
                </td>
              </tr>
            ) : data?.users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400 text-xs">
                  No users found
                </td>
              </tr>
            ) : (
              data?.users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium truncate max-w-[180px]">{u.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[180px]">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <PlanBadge plan={guessPlan(u)} />
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {u.trialAllowed}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {fmtBytes(u.storageUsedBytes)} / {fmtBytes(u.storageQuotaBytes)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        u.emailVerified
                          ? "bg-green-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      title={u.emailVerified ? "Verified" : "Unverified"}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-gray-500">
            Page {data.page} of {data.pages} ({data.total} users)
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            onSaved(u);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

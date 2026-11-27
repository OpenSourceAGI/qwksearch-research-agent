"use client";

/**
 * @fileoverview Review queue for the full text readers suggest for citation
 * cards that have none (the red X on an `extract-refdoc` references page).
 * Lists submissions with the card they are for, the suggested text and when it
 * came in, with approve / reject actions. Reads and writes go through
 * `/api/admin/card-text-submissions`.
 */

import { useCallback, useEffect, useState } from "react";

type Status = "pending" | "approved" | "rejected";

type Submission = {
  id: number;
  documentKey: string;
  documentTitle: string | null;
  referenceKey: string;
  referenceLabel: string | null;
  submittedText: string;
  status: Status;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

type Payload = {
  submissions: Submission[];
  page: number;
  pageCount: number;
  matched: number;
  counts: Record<Status, number>;
};

const TABS: { value: Status | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const BADGE: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const buttonClass =
  "px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50";

/** SQLite's CURRENT_TIMESTAMP is UTC without a zone marker. */
function when(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminCardTextPage() {
  const [tab, setTab] = useState<Status | "all">("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/card-text-submissions?status=${tab}&page=${page}`);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: number, status: Status) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/card-text-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Card text suggestions</h1>
        <p className="text-sm text-gray-500">
          Full text readers suggested for citation cards that had none. Anyone can submit; approve
          or reject each one here.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === value
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400"
            }`}
          >
            {label}
            {value !== "all" && data ? ` (${data.counts[value]})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !data && <p className="text-sm text-gray-500">Loading…</p>}
      {data && data.submissions.length === 0 && (
        <p className="text-sm text-gray-500">No submissions here.</p>
      )}

      <ul className="space-y-3">
        {data?.submissions.map((s) => (
          <li
            key={s.id}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-2"
          >
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">
                  {s.referenceLabel || s.referenceKey}
                </p>
                <p className="text-xs text-gray-500 break-all">
                  {s.documentTitle ? `${s.documentTitle} · ` : ""}
                  {s.documentKey} · {s.referenceKey}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[s.status]}`}>
                {s.status}
              </span>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400">
                Suggested text ({s.submittedText.length.toLocaleString()} characters)
              </summary>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words max-h-96 overflow-auto">
                {s.submittedText}
              </p>
            </details>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">
                {when(s.createdAt)}
                {s.reviewedAt ? ` · reviewed ${when(s.reviewedAt)}${s.reviewedBy ? ` by ${s.reviewedBy}` : ""}` : ""}
              </span>
              <span className="ml-auto flex gap-2">
                {s.status !== "approved" && (
                  <button className={buttonClass} disabled={busy === s.id} onClick={() => review(s.id, "approved")}>
                    Approve
                  </button>
                )}
                {s.status !== "rejected" && (
                  <button className={buttonClass} disabled={busy === s.id} onClick={() => review(s.id, "rejected")}>
                    Reject
                  </button>
                )}
                {s.status !== "pending" && (
                  <button className={buttonClass} disabled={busy === s.id} onClick={() => review(s.id, "pending")}>
                    Back to pending
                  </button>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {data && data.pageCount > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button className={buttonClass} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {data.page} of {data.pageCount}
          </span>
          <button className={buttonClass} disabled={page >= data.pageCount} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

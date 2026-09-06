"use client";

/**
 * Admin diagnostic for the chat output pipeline.
 *
 * Runs the exact request the chat UI sends (POST /api/agent/chat, SSE
 * response) and reports per-stage results: provider discovery, HTTP status,
 * streamed frame counts, the assembled answer, and any error frames. Use it
 * to answer "why is the chat not showing output?" — the verdict names the
 * first stage that failed instead of the UI's silent toast.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface MinimalModel {
  key: string;
  name: string;
}

interface MinimalProvider {
  id: string;
  name: string;
  type?: string;
  chatModels: MinimalModel[];
}

interface FrameLogEntry {
  at: number;
  type: string;
  detail: string;
}

interface RunResult {
  verdict: "pass" | "fail";
  reason: string;
  httpStatus?: number;
  counts: Record<string, number>;
  answer: string;
  errors: string[];
  durationMs: number;
}

const TEST_PROMPT = "Reply with the single word: OK";

export default function ChatTestPage() {
  const [providers, setProviders] = useState<MinimalProvider[] | null>(null);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [focusMode, setFocusMode] = useState("webSearch");
  const [prompt, setPrompt] = useState(TEST_PROMPT);
  const [running, setRunning] = useState(false);
  const [frames, setFrames] = useState<FrameLogEntry[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stage 1: provider discovery — the same call the chat UI's checkConfig makes.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/agent/providers");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setProvidersError(`HTTP ${res.status}: ${data?.error ?? data?.message ?? "request failed"}`);
          setProviders([]);
          return;
        }
        const list: MinimalProvider[] = data?.providers ?? [];
        setProviders(list);
        if (data?.error) setProvidersError(String(data.error));
        const first = list.find((p) => (p.chatModels?.length ?? 0) > 0);
        if (first) {
          setProviderId(first.id);
          setModelKey(first.chatModels[0].key);
        }
      } catch (err) {
        setProvidersError(err instanceof Error ? err.message : String(err));
        setProviders([]);
      }
    })();
  }, []);

  const selectedProvider = providers?.find((p) => p.id === providerId);

  const runTest = useCallback(async () => {
    setRunning(true);
    setFrames([]);
    setResult(null);
    const t0 = Date.now();
    const log: FrameLogEntry[] = [];
    const counts: Record<string, number> = {};
    const errors: string[] = [];
    let answer = "";

    const pushFrame = (type: string, detail: string) => {
      counts[type] = (counts[type] ?? 0) + 1;
      log.push({ at: Date.now() - t0, type, detail });
      setFrames([...log]);
    };

    const finish = (verdict: "pass" | "fail", reason: string, httpStatus?: number) => {
      setResult({
        verdict,
        reason,
        httpStatus,
        counts: { ...counts },
        answer,
        errors: [...errors],
        durationMs: Date.now() - t0,
      });
      setRunning(false);
    };

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Stage 2: the exact chat request the UI sends.
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          message: {
            messageId: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
            chatId: `admin-chat-test-${Date.now()}`,
            content: prompt,
          },
          optimizationMode: "speed",
          focusMode,
          category: "general",
          history: [],
          files: [],
          chatModel: { key: modelKey, providerId },
          sourceExtractionEnabled: false,
          thinkingTimeLimit: 0,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        let detail = body;
        try {
          detail = JSON.parse(body)?.message ?? body;
        } catch {
          /* keep raw body */
        }
        finish("fail", `The server rejected the chat request: ${detail}`, res.status);
        return;
      }
      if (!res.body) {
        finish("fail", "The server returned no response body to stream.", res.status);
        return;
      }

      // Stage 3: consume the SSE stream, frame by frame.
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let sawMessageEnd = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          let event: { type?: string; data?: unknown } = {};
          try {
            event = JSON.parse(dataLine.replace(/^data:\s*/, ""));
          } catch {
            pushFrame("unparseable", dataLine.slice(0, 200));
            continue;
          }
          const type = event.type ?? "unknown";
          if (type === "message") {
            answer += String(event.data ?? "");
            pushFrame("message", String(event.data ?? ""));
          } else if (type === "error") {
            errors.push(String(event.data ?? ""));
            pushFrame("error", String(event.data ?? ""));
          } else if (type === "sources") {
            const sources = Array.isArray(event.data) ? event.data : [];
            pushFrame("sources", `${sources.length} source(s)`);
          } else if (type === "messageEnd") {
            sawMessageEnd = true;
            pushFrame("messageEnd", "stream completed");
          } else {
            pushFrame(type, JSON.stringify(event.data)?.slice(0, 200) ?? "");
          }
        }
      }

      if (errors.length > 0) {
        finish(
          "fail",
          `The model/provider returned an error instead of output: ${errors.join("; ")}`,
          res.status,
        );
      } else if ((counts["message"] ?? 0) === 0) {
        finish(
          "fail",
          sawMessageEnd
            ? "The stream completed but contained zero output frames — the model produced no text."
            : "The stream ended without any output frames or a completion frame — it was cut off.",
          res.status,
        );
      } else if (!sawMessageEnd) {
        finish(
          "fail",
          "Output arrived but the stream was cut off before completing (no messageEnd frame).",
          res.status,
        );
      } else {
        finish("pass", "Chat output streamed and completed normally.", res.status);
      }
    } catch (err) {
      finish(
        "fail",
        `The request failed before any response streamed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [prompt, focusMode, modelKey, providerId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const badge = (ok: boolean, label: string) => (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
        ok
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      }`}
    >
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Chat Output Test</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sends a real request through the chat pipeline (providers → /api/agent/chat →
          SSE stream) and reports the first stage that fails.
        </p>
      </div>

      {/* Stage 1: providers */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <h2 className="text-sm font-semibold">1. Provider discovery</h2>
        {providers === null ? (
          <p className="text-sm text-gray-500">Loading /api/agent/providers…</p>
        ) : (
          <>
            <p className="text-sm">
              {badge(providers.length > 0, providers.length > 0 ? `${providers.length} provider(s)` : "No providers")}{" "}
              {providersError && (
                <span className="text-red-600 dark:text-red-400">{providersError}</span>
              )}
            </p>
            {providers.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                With no providers, the chat UI still loads but every send fails —
                this is the most common cause of &quot;no chat output&quot;. Check the
                provider API keys under{" "}
                <a href="/admin/freekeys" className="text-blue-600 dark:text-blue-400 underline">
                  API Keys
                </a>
                .
              </p>
            )}
          </>
        )}
      </section>

      {/* Stage 2: run config */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">2. Streaming chat request</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">Provider</span>
            <select
              className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
              value={providerId}
              onChange={(e) => {
                setProviderId(e.target.value);
                const p = providers?.find((pr) => pr.id === e.target.value);
                setModelKey(p?.chatModels?.[0]?.key ?? "");
              }}
            >
              <option value="">(auto / server default)</option>
              {providers?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">Model</span>
            <select
              className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
              value={modelKey}
              onChange={(e) => setModelKey(e.target.value)}
            >
              <option value="">(auto)</option>
              {selectedProvider?.chatModels?.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">Focus mode</span>
            <select
              className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
              value={focusMode}
              onChange={(e) => setFocusMode(e.target.value)}
            >
              <option value="webSearch">webSearch</option>
              <option value="writingAssistant">writingAssistant</option>
            </select>
          </label>
          <label className="grow text-sm min-w-64">
            <span className="block text-xs text-gray-500 mb-1">Test prompt</span>
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <button
            onClick={runTest}
            disabled={running}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? "Running…" : "Run test"}
          </button>
        </div>
      </section>

      {/* Stage 3: results */}
      {(result || frames.length > 0) && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold">3. Result</h2>
          {result && (
            <div className="space-y-2">
              <p className="text-sm">
                {badge(result.verdict === "pass", result.verdict.toUpperCase())}{" "}
                <span className={result.verdict === "pass" ? "" : "text-red-600 dark:text-red-400"}>
                  {result.reason}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.httpStatus !== undefined && <>HTTP {result.httpStatus} · </>}
                {Object.entries(result.counts)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ") || "no frames"}{" "}
                · {result.durationMs}ms
              </p>
              {result.answer && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Assembled answer</p>
                  <pre className="max-h-48 overflow-auto rounded bg-gray-50 dark:bg-gray-900 p-3 text-xs whitespace-pre-wrap">
                    {result.answer}
                  </pre>
                </div>
              )}
            </div>
          )}
          {frames.length > 0 && (
            <details open={!result || result.verdict === "fail"}>
              <summary className="cursor-pointer text-xs font-semibold text-gray-500">
                Frame log ({frames.length})
              </summary>
              <div className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 dark:bg-gray-900 p-3 font-mono text-xs">
                {frames.map((f, i) => (
                  <div key={i} className={f.type === "error" ? "text-red-600 dark:text-red-400" : ""}>
                    +{f.at}ms [{f.type}] {f.detail}
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

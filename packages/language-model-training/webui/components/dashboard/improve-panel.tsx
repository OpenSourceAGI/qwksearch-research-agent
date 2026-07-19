"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type SampleQA } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";

export function ImprovePanel() {
  const [providers, setProviders] = React.useState<Record<string, string>>({});
  const [samples, setSamples] = React.useState<SampleQA[]>([]);
  const [provider, setProvider] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("");
  const [question, setQuestion] = React.useState("");
  const [draftAnswer, setDraftAnswer] = React.useState("");
  const [improvedAnswer, setImprovedAnswer] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    api
      .sampleQA()
      .then((res) => {
        setProviders(res.providers);
        setSamples(res.samples);
        setProvider((prev) => prev || Object.keys(res.providers)[0] || "");
        if (res.samples[0]) {
          setQuestion(res.samples[0].question);
          setDraftAnswer(res.samples[0].draft_answer);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function applySample(id: string) {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    setQuestion(sample.question);
    setDraftAnswer(sample.draft_answer);
    setImprovedAnswer(null);
  }

  async function handleImprove() {
    setBusy(true);
    setError(null);
    setImprovedAnswer(null);
    try {
      const res = await api.improve({
        provider,
        api_key: apiKey,
        question,
        draft_answer: draftAnswer,
        model: model || undefined,
      });
      setImprovedAnswer(res.improved_answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Improve a draft answer</CardTitle>
        <CardDescription>
          Sends the local (small, undertrained) model&apos;s draft answer to a hosted provider you bring
          your own API key for, and asks it for a corrected version. Your key is sent directly in this
          request only — it is never written to disk, logged, or stored (see src/training/improve.py).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Sample question
            <select
              className={inputClass}
              onChange={(e) => applySample(e.target.value)}
              defaultValue={samples[0]?.id}
            >
              {samples.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.question}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Provider
            <select className={inputClass} value={provider} onChange={(e) => setProvider(e.target.value)}>
              {Object.entries(providers).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Question
          <textarea
            className={inputClass}
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Draft answer (from the local model)
          <textarea
            className={inputClass}
            rows={3}
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            API key
            <input
              type="password"
              className={inputClass}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Model override (optional)
            <input
              className={inputClass}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="provider default"
            />
          </label>
        </div>

        {improvedAnswer && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="mb-1 font-semibold text-foreground">Improved answer</p>
            <p className="text-muted-foreground">{improvedAnswer}</p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleImprove} disabled={busy || !provider || !apiKey || !question || !draftAnswer}>
          {busy ? "Improving..." : "Improve answer"}
        </Button>
      </CardFooter>
    </Card>
  );
}

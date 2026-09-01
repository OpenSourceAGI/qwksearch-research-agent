"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobInfo } from "@/lib/api";
import { streamJobLogs } from "@/lib/api";

interface JobPanelProps {
  title: string;
  description: string;
  jobName: string;
  /** Fetches current status once on mount, e.g. api.trainStatus. Swallows 404s (job never started). */
  fetchStatus: () => Promise<JobInfo>;
  start: () => Promise<JobInfo>;
  stop: () => Promise<{ stopped: boolean }>;
  /** Extra form controls (e.g. language picker) rendered above the action buttons. */
  children?: React.ReactNode;
}

export function JobPanel({ title, description, jobName, fetchStatus, start, stop, children }: JobPanelProps) {
  const [job, setJob] = React.useState<JobInfo | null>(null);
  const [log, setLog] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const logRef = React.useRef<HTMLPreElement>(null);

  const appendLine = React.useCallback((line: string) => {
    setLog((prev) => `${prev}${line}\n`);
  }, []);

  const subscribe = React.useCallback(() => {
    return streamJobLogs(jobName, appendLine, (exitCode) => {
      setJob((prev) => (prev ? { ...prev, running: false, exit_code: exitCode } : prev));
    });
  }, [jobName, appendLine]);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    fetchStatus()
      .then((info) => {
        setJob(info);
        if (info.running) {
          // The SSE stream always replays the log file from the start, so
          // leave `log` empty here rather than double-printing log_tail.
          setLog("");
          unsubscribe = subscribe();
        } else {
          setLog(info.log_tail);
        }
      })
      .catch(() => {
        // No job has been started yet - that's fine, leave the panel idle.
      });

    return () => unsubscribe?.();
  }, [fetchStatus, subscribe]);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  async function handleStart() {
    setBusy(true);
    setError(null);
    setLog("");
    try {
      const info = await start();
      setJob(info);
      subscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    setError(null);
    try {
      await stop();
      setJob((prev) => (prev ? { ...prev, running: false } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const running = job?.running ?? false;
  const statusVariant = running ? "success" : job?.exit_code === 0 ? "muted" : job?.exit_code != null ? "destructive" : "outline";
  const statusLabel = running ? "running" : job?.exit_code === 0 ? "completed" : job?.exit_code != null ? `failed (${job.exit_code})` : "idle";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant={statusVariant as "success" | "muted" | "destructive" | "outline"}>{statusLabel}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {children}
        {job?.instance_id && (
          <p className="text-xs text-muted-foreground">
            Vast.ai instance {job.instance_id}
            {job.gpu_name ? ` · ${job.gpu_name}` : ""}
            {job.cost_per_hour != null ? ` · $${job.cost_per_hour}/hr` : ""}
            {job.ssh_host ? ` · ${job.ssh_host}:${job.ssh_port}` : ""}
          </p>
        )}
        <pre
          ref={logRef}
          className="h-48 overflow-y-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground"
        >
          {log || "No output yet."}
        </pre>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleStart} disabled={busy || running}>
          Start
        </Button>
        <Button variant="outline" onClick={handleStop} disabled={busy || !running}>
          Stop
        </Button>
      </CardFooter>
    </Card>
  );
}

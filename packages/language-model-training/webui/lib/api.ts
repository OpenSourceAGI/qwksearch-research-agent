/**
 * Thin client for the FastAPI control API (../../src/services/server.py).
 *
 * Points at NEXT_PUBLIC_API_URL (defaults to localhost:8080, the port the
 * Dockerfile/wrangler.jsonc container exposes). Every job (download,
 * train) follows the same shape: POST .../start, POST .../stop,
 * GET ... for status, GET .../stream for an SSE log tail.
 *
 * The train job runs on a rented Vast.ai GPU rather than in-container - see
 * src/services/vast_job.py. Its JobInfo carries extra instance fields
 * (instance_id, ssh_host, gpu_name, cost_per_hour) alongside the normal ones.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export interface JobInfo {
  name: string;
  running: boolean;
  exit_code: number | null;
  pid: number;
  started_at: number;
  finished_at: number | null;
  log_tail: string;
  /** Present on jobs provisioned on Vast.ai (currently just "train"). */
  backend?: "vast.ai";
  instance_id?: number | null;
  ssh_host?: string | null;
  ssh_port?: number | null;
  gpu_name?: string | null;
  cost_per_hour?: number | null;
}

export interface StartTrainRequest {
  gpu_name?: string;
  num_gpus?: number;
  max_hourly?: number;
  image?: string;
  disk_gb?: number;
  train_cmd?: string;
}

export interface StatusResponse {
  service: string;
  reference: string;
  jobs: Record<string, JobInfo>;
}

export interface SampleQA {
  id: string;
  question: string;
  draft_answer: string;
}

export interface SampleQAResponse {
  providers: Record<string, string>;
  samples: SampleQA[];
}

export interface ImproveRequest {
  provider: string;
  api_key: string;
  question: string;
  draft_answer: string;
  model?: string;
}

export interface ImproveResponse {
  provider: string;
  improved_answer: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; service: string }>("/health"),
  status: () => request<StatusResponse>("/api/status"),

  sampleQA: () => request<SampleQAResponse>("/api/sample-qa"),
  improve: (body: ImproveRequest) =>
    request<ImproveResponse>("/api/improve", { method: "POST", body: JSON.stringify(body) }),

  startDownload: (body?: { lang?: string; dump_file?: string }) =>
    request<JobInfo>("/api/jobs/download-wikipedia/start", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  stopDownload: () =>
    request<{ stopped: boolean }>("/api/jobs/download-wikipedia/stop", { method: "POST" }),
  downloadStatus: () => request<JobInfo>("/api/jobs/download-wikipedia"),

  startTrain: (body?: StartTrainRequest) =>
    request<JobInfo>("/api/jobs/train/start", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  stopTrain: () => request<{ stopped: boolean }>("/api/jobs/train/stop", { method: "POST" }),
  trainStatus: () => request<JobInfo>("/api/jobs/train"),
};

/**
 * Subscribes to a job's live log stream (Server-Sent Events) until the job
 * finishes or the caller aborts. Returns an unsubscribe function.
 */
export function streamJobLogs(
  name: string,
  onLine: (line: string) => void,
  onDone?: (exitCode: number | null) => void,
): () => void {
  const source = new EventSource(`${API_URL}/api/jobs/${name}/stream`);

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as { line?: string; done?: boolean; exit_code?: number | null };
      if (payload.line !== undefined) onLine(payload.line);
      if (payload.done) {
        onDone?.(payload.exit_code ?? null);
        source.close();
      }
    } catch {
      // Ignore malformed SSE frames rather than crashing the stream.
    }
  };

  source.onerror = () => {
    source.close();
  };

  return () => source.close();
}

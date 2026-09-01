"use client";

import * as React from "react";

import { JobPanel } from "@/components/dashboard/job-panel";
import { api } from "@/lib/api";

export function TrainPanel() {
  const [gpuName, setGpuName] = React.useState("RTX_4090");
  const [maxHourly, setMaxHourly] = React.useState("1.50");

  return (
    <JobPanel
      title="Train transformer on Vast.ai"
      description="Rents a GPU on Vast.ai, uploads this package to it, and runs the full pipeline there (tokenizer -> dataset -> GPT-style transformer -> sample generation, src/training/wikipedia_transformer.py). The instance is destroyed automatically when the run finishes or is stopped. Requires VAST_API_KEY on the API container."
      jobName="train"
      fetchStatus={api.trainStatus}
      start={() => api.startTrain({ gpu_name: gpuName, max_hourly: Number(maxHourly) || undefined })}
      stop={api.stopTrain}
    >
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          GPU
          <input
            value={gpuName}
            onChange={(e) => setGpuName(e.target.value)}
            placeholder="RTX_4090"
            className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Max $/hr
          <input
            value={maxHourly}
            onChange={(e) => setMaxHourly(e.target.value)}
            placeholder="1.50"
            inputMode="decimal"
            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>
      </div>
    </JobPanel>
  );
}

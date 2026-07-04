"use client";

import { JobPanel } from "@/components/dashboard/job-panel";
import { api } from "@/lib/api";

export function TrainPanel() {
  return (
    <JobPanel
      title="Train transformer"
      description="Full pipeline: tokenizer -> dataset -> GPT-style transformer -> sample generation (src/training/wikipedia_transformer.py). Set USE_DEMO_MODE=false on the API container for the real Wikipedia corpus."
      jobName="train"
      fetchStatus={api.trainStatus}
      start={api.startTrain}
      stop={api.stopTrain}
    />
  );
}

"use client";

import * as React from "react";

import { JobPanel } from "@/components/dashboard/job-panel";
import { api } from "@/lib/api";

export function DownloadPanel() {
  const [lang, setLang] = React.useState("en");

  return (
    <JobPanel
      title="Download Wikipedia dump"
      description="aria2c over BitTorrent (HTTP fallback) - scripts/download_wikipedia_torrent.sh"
      jobName="download-wikipedia"
      fetchStatus={api.downloadStatus}
      start={() => api.startDownload({ lang })}
      stop={api.stopDownload}
    >
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Language code
        <input
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          placeholder="en"
          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
    </JobPanel>
  );
}

"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { API_URL, api } from "@/lib/api";

export function HealthBadge() {
  const [online, setOnline] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        await api.health();
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    poll();
    const interval = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Badge variant={online ? "success" : online === false ? "destructive" : "muted"}>
        {online ? "API online" : online === false ? "API unreachable" : "checking..."}
      </Badge>
      <span>{API_URL}</span>
    </div>
  );
}

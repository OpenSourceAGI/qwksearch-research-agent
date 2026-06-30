"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function MicrogradPanel() {
  const [output, setOutput] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [ok, setOk] = React.useState<boolean | null>(null);

  async function run() {
    setRunning(true);
    setOk(null);
    setOutput("");
    try {
      const result = await api.runMicrograd();
      setOk(result.ok);
      setOutput(result.stdout + (result.stderr ? `\n--- stderr ---\n${result.stderr}` : ""));
    } catch (err) {
      setOk(false);
      setOutput(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Micrograd demo</CardTitle>
        <CardDescription>
          Runs the ~150-line autograd engine (karpathy/micrograd port) and trains a tiny next-word model
          synchronously — fast enough to run in the same request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="h-48 overflow-y-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          {output || "No output yet."}
        </pre>
      </CardContent>
      <CardFooter>
        <Button onClick={run} disabled={running}>
          {running ? "Running..." : "Run demo"}
        </Button>
        {ok !== null && (
          <span className={ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
            {ok ? "Succeeded" : "Failed"}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

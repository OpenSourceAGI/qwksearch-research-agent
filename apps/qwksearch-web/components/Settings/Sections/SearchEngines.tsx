"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Play, AlertCircle } from "lucide-react";
import grab from "grab-url";

interface SearchEngine {
  name: string;
  categories: string[];
}

interface EngineStatus {
  name: string;
  working: boolean;
  error?: string;
}

interface CategoryEngines {
  [category: string]: SearchEngine[];
}

const SearchEngines = ({
  fields,
  values,
}: {
  fields: any[];
  values: Record<string, any>;
}) => {
  const [engines, setEngines] = useState<CategoryEngines>({});
  const [enabledEngines, setEnabledEngines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, EngineStatus>>(new Map());

  useEffect(() => {
    fetchEngines();
    loadEnabledEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      const response = await grab("/api/search/engines");
      setEngines(response.engines || {});
    } catch (error) {
      console.error("Failed to fetch engines:", error);
      toast.error("Failed to load search engines");
    } finally {
      setLoading(false);
    }
  };

  const loadEnabledEngines = async () => {
    try {
      const response = await grab("/api/search/engines/status");
      const enabledSet = new Set(response.enabledEngines || []);
      setEnabledEngines(enabledSet);
    } catch (error) {
      console.error("Failed to load enabled engines:", error);
    }
  };

  const toggleEngine = async (engineName: string) => {
    const newEnabled = new Set(enabledEngines);
    if (newEnabled.has(engineName)) {
      newEnabled.delete(engineName);
    } else {
      newEnabled.add(engineName);
    }
    setEnabledEngines(newEnabled);

    try {
      await grab("/api/search/engines/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledEngines: Array.from(newEnabled),
        }),
      });
    } catch (error) {
      console.error("Failed to save engine status:", error);
      toast.error("Failed to save engine status");
      setEnabledEngines(enabledEngines);
    }
  };

  const testAllEngines = async () => {
    setTesting(true);
    setTestResults(new Map());

    try {
      const response = await grab("/api/search/engines/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engines: Array.from(enabledEngines),
        }),
      });

      const results = new Map<string, EngineStatus>();
      Object.entries(response.results || {}).forEach(([name, status]: [string, any]) => {
        results.set(name, status);
      });
      setTestResults(results);

      const working = Array.from(results.values()).filter(r => r.working).length;
      const total = results.size;
      toast.success(`${working}/${total} search engines working`);
    } catch (error) {
      console.error("Failed to test engines:", error);
      toast.error("Failed to test search engines");
    } finally {
      setTesting(false);
    }
  };

  const removeNonWorkingEngines = async () => {
    const workingEngines = Array.from(testResults.entries())
      .filter(([_, status]) => status.working)
      .map(([name]) => name);

    setEnabledEngines(new Set(workingEngines));

    try {
      await grab("/api/search/engines/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledEngines: workingEngines,
        }),
      });
      toast.success(`Disabled ${enabledEngines.size - workingEngines.length} non-working engines`);
    } catch (error) {
      console.error("Failed to update engines:", error);
      toast.error("Failed to update engine status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const categories = Object.keys(engines).sort();
  const totalEngines = Object.values(engines).reduce((sum, list) => sum + list.length, 0);
  const workingCount = Array.from(testResults.values()).filter(r => r.working).length;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      {/* Summary section */}
      <section className="rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm lg:text-sm text-black dark:text-white">
              Search Engine Sources
            </h4>
            <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
              Toggle search sources on/off by category. Total: {totalEngines} engines
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={testAllEngines}
              disabled={testing || enabledEngines.size === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              <Play className="h-4 w-4" />
              Test All ({enabledEngines.size})
            </Button>
            {testResults.size > 0 && (
              <>
                <span className="text-xs text-black/60 dark:text-white/60 flex items-center gap-2">
                  {workingCount}/{testResults.size} working
                </span>
                {workingCount < testResults.size && (
                  <Button
                    size="sm"
                    onClick={removeNonWorkingEngines}
                    variant="destructive"
                    className="text-xs"
                  >
                    Remove Non-Working
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.map((category) => (
        <section
          key={category}
          className="rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80"
        >
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-black dark:text-white capitalize">
              {category} ({engines[category].length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {engines[category].map((engine) => {
                const isEnabled = enabledEngines.has(engine.name);
                const testStatus = testResults.get(engine.name);
                return (
                  <div
                    key={engine.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-light-200/50 dark:border-dark-200/50 hover:bg-light-200/50 dark:hover:bg-dark-200/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleEngine(engine.name)}
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-black dark:text-white capitalize">
                          {engine.name.replace(/_/g, " ")}
                        </p>
                        {testStatus && (
                          <div className="flex items-center gap-1 mt-1">
                            {testStatus.working ? (
                              <span className="text-[10px] text-green-600 dark:text-green-400">
                                ✓ Working
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {testStatus.error || "Failed"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default SearchEngines;

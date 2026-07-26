"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Play, AlertCircle, Search } from "lucide-react";
import grab from "grab-url";

interface SearchEngine {
  name: string;
  categories: string[];
  description?: string;
  domain?: string;
}

interface EngineStatus {
  name: string;
  working: boolean;
  error?: string;
}

interface CategoryEngines {
  [category: string]: SearchEngine[];
}

const FAVICON_URL = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

const EngineFavicon = ({ domain, name }: { domain?: string; name: string }) => {
  const [errored, setErrored] = useState(false);
  if (!domain || errored) {
    return (
      <div className="w-5 h-5 rounded-sm bg-light-300 dark:bg-dark-300 flex items-center justify-center text-[10px] font-bold text-black/40 dark:text-white/40 flex-shrink-0">
        {name[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={FAVICON_URL(domain)}
      alt=""
      width={20}
      height={20}
      className="w-5 h-5 rounded-sm flex-shrink-0 object-contain"
      onError={() => setErrored(true)}
    />
  );
};

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
  const [activeTab, setActiveTab] = useState<string>("");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine | null>(null);

  useEffect(() => {
    fetchEngines();
    loadEnabledEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      const response = await grab("search/engines");
      const data: CategoryEngines = response.engines || {};
      setEngines(data);
      const first = Object.keys(data).sort()[0];
      if (first) setActiveTab(first);
    } catch (error) {
      console.error("Failed to fetch engines:", error);
      toast.error("Failed to load search engines");
    } finally {
      setLoading(false);
    }
  };

  const loadEnabledEngines = async () => {
    try {
      const response = await grab("search/engines/status");
      setEnabledEngines(new Set(response.enabledEngines || []));
    } catch (error) {
      console.error("Failed to load enabled engines:", error);
    }
  };

  const toggleEngine = async (engineName: string) => {
    const newEnabled = new Set(enabledEngines);
    if (newEnabled.has(engineName)) newEnabled.delete(engineName);
    else newEnabled.add(engineName);
    setEnabledEngines(newEnabled);
    try {
      await grab("search/engines/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledEngines: Array.from(newEnabled) }),
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
      const response = await grab("search/engines/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engines: Array.from(enabledEngines) }),
      });
      const results = new Map<string, EngineStatus>();
      Object.entries(response.results || {}).forEach(([name, status]: [string, any]) => {
        results.set(name, status);
      });
      setTestResults(results);
      const working = Array.from(results.values()).filter(r => r.working).length;
      toast.success(`${working}/${results.size} search engines working`);
    } catch (error) {
      console.error("Failed to test engines:", error);
      toast.error("Failed to test search engines");
    } finally {
      setTesting(false);
    }
  };

  const removeNonWorkingEngines = async () => {
    const workingEngines = Array.from(testResults.entries())
      .filter(([_, s]) => s.working)
      .map(([name]) => name);
    setEnabledEngines(new Set(workingEngines));
    try {
      await grab("search/engines/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledEngines: workingEngines }),
      });
      toast.success(`Disabled ${enabledEngines.size - workingEngines.length} non-working engines`);
    } catch (error) {
      console.error("Failed to update engines:", error);
      toast.error("Failed to update engine status");
    }
  };

  const categories = useMemo(() => Object.keys(engines).sort(), [engines]);
  const totalEngines = useMemo(
    () => Object.values(engines).reduce((sum, list) => sum + list.length, 0),
    [engines]
  );
  const workingCount = Array.from(testResults.values()).filter(r => r.working).length;

  // When filter is active, show matches across all categories
  const filteredEngines = useMemo(() => {
    if (!filterQuery.trim()) return null;
    const q = filterQuery.toLowerCase();
    const matches: SearchEngine[] = [];
    Object.values(engines).forEach(list => {
      list.forEach(e => {
        if (e.name.replace(/_/g, " ").toLowerCase().includes(q)) matches.push(e);
      });
    });
    return matches;
  }, [filterQuery, engines]);

  const displayEngines: SearchEngine[] = filteredEngines ?? (engines[activeTab] || []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-6 py-6 gap-4">
      {/* Header */}
      <section className="rounded-xl border border-light-200 bg-light-primary/80 p-4 transition-colors dark:border-dark-200 dark:bg-dark-primary/80 flex-shrink-0">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm text-black dark:text-white">Search Engine Sources</h4>
            <p className="text-[11px] text-black/50 dark:text-white/50">
              Toggle sources on/off. Total: {totalEngines} engines across {categories.length} categories
            </p>
          </div>
          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/40 dark:text-white/40 pointer-events-none" />
            <Input
              value={filterQuery}
              onChange={e => { setFilterQuery(e.target.value); setSelectedEngine(null); }}
              placeholder="Filter engines…"
              className="pl-8 h-8 text-xs"
            />
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
                <span className="text-xs text-black/60 dark:text-white/60 flex items-center">
                  {workingCount}/{testResults.size} working
                </span>
                {workingCount < testResults.size && (
                  <Button size="sm" onClick={removeNonWorkingEngines} variant="destructive" className="text-xs">
                    Remove Non-Working
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Category tabs + engine list */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-light-200 bg-light-primary/80 dark:border-dark-200 dark:bg-dark-primary/80 overflow-hidden">
        {/* Tabs — hidden when filtering */}
        {!filterQuery && (
          <div className="flex overflow-x-auto border-b border-light-200 dark:border-dark-200 flex-shrink-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveTab(cat); setSelectedEngine(null); }}
                className={`px-3 py-2 text-xs font-medium capitalize whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                  activeTab === cat
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                }`}
              >
                {cat} <span className="ml-1 text-[10px] opacity-60">({engines[cat]?.length ?? 0})</span>
              </button>
            ))}
          </div>
        )}

        {filterQuery && (
          <div className="px-4 py-2 text-[11px] text-black/50 dark:text-white/50 border-b border-light-200 dark:border-dark-200 flex-shrink-0">
            {filteredEngines?.length ?? 0} result{filteredEngines?.length !== 1 ? "s" : ""} for "{filterQuery}"
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Engine list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {displayEngines.length === 0 ? (
              <p className="text-xs text-black/40 dark:text-white/40 py-4 text-center">No engines found</p>
            ) : (
              displayEngines.map(engine => {
                const isEnabled = enabledEngines.has(engine.name);
                const testStatus = testResults.get(engine.name);
                const isSelected = selectedEngine?.name === engine.name;
                return (
                  <button
                    key={engine.name}
                    onClick={() => setSelectedEngine(isSelected ? null : engine)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-blue-400/50 bg-blue-50/50 dark:bg-blue-900/20"
                        : "border-light-200/50 dark:border-dark-200/50 hover:bg-light-200/50 dark:hover:bg-dark-200/50"
                    }`}
                  >
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleEngine(engine.name)}
                      onClick={e => e.stopPropagation()}
                    />
                    <EngineFavicon domain={engine.domain} name={engine.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-black dark:text-white capitalize truncate">
                        {engine.name.replace(/_/g, " ")}
                      </p>
                      {testStatus && (
                        <span className={`text-[10px] ${testStatus.working ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} flex items-center gap-1`}>
                          {testStatus.working ? "✓ Working" : (
                            <><AlertCircle className="h-3 w-3" />{testStatus.error || "Failed"}</>
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Description panel */}
          {selectedEngine && (
            <div className="w-56 flex-shrink-0 border-l border-light-200 dark:border-dark-200 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <EngineFavicon domain={selectedEngine.domain} name={selectedEngine.name} />
                <h4 className="text-xs font-semibold text-black dark:text-white capitalize">
                  {selectedEngine.name.replace(/_/g, " ")}
                </h4>
              </div>
              {selectedEngine.domain && (
                <p className="text-[10px] text-black/40 dark:text-white/40 mb-2">{selectedEngine.domain}</p>
              )}
              {selectedEngine.description ? (
                <p className="text-[11px] text-black/70 dark:text-white/60 leading-relaxed line-clamp-[12]">
                  {selectedEngine.description}
                </p>
              ) : (
                <p className="text-[11px] text-black/30 dark:text-white/30 italic">No description available.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedEngine.categories.map(cat => (
                  <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded-full bg-light-200 dark:bg-dark-200 text-black/50 dark:text-white/50 capitalize">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchEngines;

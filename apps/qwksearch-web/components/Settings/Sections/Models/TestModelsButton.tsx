'use client';

import { useState } from 'react';
import { Button } from '../../../ui/button';
import { FlaskConical, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import grab from 'grab-url';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';

interface TestModelsButtonProps {
  providerId: string;
  providerType: string;
  providerName: string;
  apiKey: string;
}

interface ModelTestResult {
  modelId: string;
  modelName: string;
  available: boolean;
  error?: string;
  latency?: number;
  type?: string;
}

interface TestResult {
  provider: string;
  totalModels: number;
  availableModels: ModelTestResult[];
  unavailableModels: ModelTestResult[];
  testDuration: number;
}

export default function TestModelsButton({
  providerId,
  providerType,
  providerName,
  apiKey,
}: TestModelsButtonProps) {
  const [testing, setTesting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await grab('agent/test-models', {
        method: 'POST',
        body: {
          providerType,
          apiKey,
          onlyFree: true,
        },
      });

      // Validate response has required fields
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }

      if (!Array.isArray(response.availableModels) || !Array.isArray(response.unavailableModels)) {
        throw new Error('Invalid model test results format');
      }

      setResults(response);
      setShowResults(true);

      const available = response.availableModels?.length || 0;
      const total = response.totalModels || 0;

      toast.success(
        `Found ${available}/${total} working models for ${providerName}`
      );
    } catch (error: any) {
      console.error('Model test failed:', error);
      toast.error(error.message || 'Failed to test models');
    } finally {
      setTesting(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <>
      <Button
        onClick={handleTest}
        disabled={testing}
        variant="outline"
        size="sm"
        className="gap-2 h-8 text-xs"
      >
        {testing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <FlaskConical size={14} />
            Test Models
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Model Test Results: {providerName}</DialogTitle>
            <DialogDescription>
              Testing completed in {results && formatDuration(results.testDuration)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {results && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary">
                    <p className="text-xs text-black/60 dark:text-white/60 mb-1">
                      Total Tested
                    </p>
                    <p className="text-2xl font-semibold text-black dark:text-white">
                      {results.totalModels}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1">
                      Available
                    </p>
                    <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
                      {results.availableModels.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                    <p className="text-xs text-red-700 dark:text-red-400 mb-1">
                      Unavailable
                    </p>
                    <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
                      {results.unavailableModels.length}
                    </p>
                  </div>
                </div>

                {/* Available Models */}
                {results.availableModels.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-black dark:text-white flex items-center gap-2">
                      <Check size={16} className="text-green-600 dark:text-green-400" />
                      Available Models
                    </h3>
                    <div className="space-y-2">
                      {results.availableModels.map((model) => (
                        <div
                          key={model.modelId}
                          className="p-3 rounded-md border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-black dark:text-white">
                              {model.modelName}
                            </p>
                            <p className="text-xs text-black/60 dark:text-white/60 font-mono">
                              {model.modelId}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {model.type && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {model.type}
                              </span>
                            )}
                            {model.latency && (
                              <span className="text-xs text-black/50 dark:text-white/50">
                                {formatDuration(model.latency)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unavailable Models */}
                {results.unavailableModels.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-black dark:text-white flex items-center gap-2">
                      <X size={16} className="text-red-600 dark:text-red-400" />
                      Unavailable Models
                    </h3>
                    <div className="space-y-2">
                      {results.unavailableModels.map((model) => (
                        <div
                          key={model.modelId}
                          className="p-3 rounded-md border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-black dark:text-white line-through decoration-red-500">
                                {model.modelName}
                              </p>
                              <p className="text-xs text-black/60 dark:text-white/60 font-mono">
                                {model.modelId}
                              </p>
                            </div>
                            {model.type && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                {model.type}
                              </span>
                            )}
                          </div>
                          {model.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {model.error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

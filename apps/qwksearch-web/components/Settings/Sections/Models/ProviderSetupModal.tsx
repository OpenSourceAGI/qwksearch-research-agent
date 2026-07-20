'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, ExternalLink, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { addProvider } from 'qwksearch-api-client';
import { ConfigModelProvider, ModelProviderUISection } from '../../../../lib/config/types';
import TestModelsButton from './TestModelsButton';
import ProviderIcon from './ProviderIcon';
import grab from 'grab-url';

interface ProviderSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ModelProviderUISection;
  onSuccess: (provider: ConfigModelProvider) => void;
}

const ProviderSetupModal = ({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: ProviderSetupModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testingModels, setTestingModels] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [showModels, setShowModels] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ConfigModelProvider | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const initialConfig: Record<string, any> = {};
      provider.fields.forEach((field) => {
        initialConfig[field.key] = field.default || '';
      });
      setConfig(initialConfig);
    }
  }, [open, provider]);

  const fetchModels = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setTestingModels(true);
    try {
      const response = await getProviderModels({
        provider: provider.key,
        config: { ...config, apiKey },
      });

      const fetchedModels = response.data?.models || response.models || [];
      setModels(fetchedModels);
      setShowModels(true);
      toast.success(`Found ${fetchedModels.length} models`);
    } catch (error: any) {
      console.error('Failed to fetch models:', error);
      toast.error(error.message || 'Failed to fetch models');
    } finally {
      setTestingModels(false);
    }
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await addProvider({
        body: {
          type: provider.key,
          config: { ...config, apiKey },
        },
      });

      const newProvider: ConfigModelProvider = response.data?.provider || response.provider;
      setSelectedProvider(newProvider);
      onSuccess(newProvider);

      toast.success('Connection added successfully');
      setApiKey('');
      setConfig({});
      setShowModels(false);
      setModels([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding provider:', error);
      toast.error(error.message || 'Failed to add connection');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const apiKeyField = provider.fields.find((f) => f.key === 'apiKey');
  const getApiKeyLink = () => {
    const links = apiKeyField?.links || [];
    return links.find((l) => l.name.toLowerCase().includes('api') || l.name.toLowerCase().includes('key'));
  };

  const apiKeyLink = getApiKeyLink();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col border bg-light-primary dark:bg-dark-primary border-light-secondary dark:border-dark-secondary p-0" hideCloseButton>
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <ProviderIcon provider={provider.key} size={24} />
            <div>
              <DialogTitle className="text-black/90 dark:text-white/90 font-medium text-base">
                {provider.name}
              </DialogTitle>
              <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                Add API key and configure models
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-light-200 dark:border-dark-200" />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!showModels ? (
            <form onSubmit={handleAddConnection} className="space-y-4">
              {/* API Key Section */}
              <div className="space-y-3 p-4 rounded-lg bg-light-secondary/30 dark:bg-dark-secondary/30 border border-light-200 dark:border-dark-200">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-black/80 dark:text-white/80">
                    API Key
                  </label>
                  {apiKeyLink && (
                    <a
                      href={apiKeyLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1"
                    >
                      Get API Key
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 text-sm text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(apiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                      title="Copy API key"
                    >
                      {copiedKey ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-black/50 dark:text-white/50">
                  Your API key is stored securely and used only to fetch available models.
                </p>
              </div>

              {/* Other Config Fields */}
              {provider.fields
                .filter((f) => f.key !== 'apiKey')
                .map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium text-black/80 dark:text-white/80">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={config[field.key] ?? field.default ?? ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={
                        (field as any).placeholder ||
                        `Enter ${field.name.toLowerCase()}`
                      }
                      className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 text-sm text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors"
                      required={field.required}
                    />
                  </div>
                ))}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={fetchModels}
                  disabled={!apiKey.trim() || testingModels}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-light-200 dark:border-dark-200 text-black dark:text-white bg-light-secondary/50 dark:bg-dark-secondary/50 hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingModels ? (
                    <>
                      <Loader2 className="animate-spin inline mr-2" size={14} />
                      Fetching...
                    </>
                  ) : (
                    'Preview Models'
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!apiKey.trim() || loading}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-sky-500 text-white hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin inline mr-2" size={14} />
                      Adding...
                    </>
                  ) : (
                    'Add Connection'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Models Preview */}
              <div className="p-4 rounded-lg bg-light-secondary/30 dark:bg-dark-secondary/30 border border-light-200 dark:border-dark-200">
                <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 mb-3">
                  Available Models ({models.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {models.map((model, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-md bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black/80 dark:text-white/80 truncate">
                            {model.name || model.id}
                          </p>
                          <code className="text-xs text-black/50 dark:text-white/50 font-mono">
                            {model.id}
                          </code>
                        </div>
                        {model.type && (
                          <span className="text-xs px-2 py-1 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 ml-2 flex-shrink-0">
                            {model.type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Models Button */}
              {selectedProvider && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Test Model Connectivity
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Run a test request to verify models are working
                      </p>
                    </div>
                    <TestModelsButton
                      providerId={selectedProvider.id}
                      providerType={selectedProvider.type}
                      providerName={selectedProvider.name}
                      apiKey={apiKey}
                      compact
                    />
                  </div>
                </div>
              )}

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setShowModels(false)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-light-200 dark:border-dark-200 text-black dark:text-white bg-light-secondary/50 dark:bg-dark-secondary/50 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
              >
                Back to Setup
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-light-200 dark:border-dark-200" />

        {/* Footer */}
        <div className="px-6 py-4 flex justify-between items-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          {showModels && (
            <button
              type="submit"
              onClick={handleAddConnection}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-500 text-white hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin inline mr-2" size={14} />
                  Adding...
                </>
              ) : (
                'Add Connection'
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderSetupModal;

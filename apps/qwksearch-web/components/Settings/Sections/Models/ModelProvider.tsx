import { UIConfigField, ConfigModelProvider } from '../../../../lib/config/types';
import { cn } from '../../../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Plug2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { deleteProviderModel } from 'qwksearch-api-client';
import { useState } from 'react';
import { toast } from 'sonner';
import AddModel from './AddModelDialog';
import UpdateProvider from './UpdateProviderDialog';
import DeleteProvider from './DeleteProviderDialog';
import TestModelsButton from './TestModelsButton';
import ProviderIcon from './ProviderIcon';

const ModelProvider = ({
  modelProvider,
  setProviders,
  fields,
}: {
  modelProvider: ConfigModelProvider;
  fields: UIConfigField[];
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}) => {
  const [open, setOpen] = useState(true);

  const handleModelDelete = async (
    type: 'chat',
    modelKey: string,
  ) => {
    try {
      await deleteProviderModel({
        path: { id: modelProvider.id },
        body: { key: modelKey, type: type },
      });

      setProviders(
        (prev) =>
          prev.map((provider) => {
            if (provider.id === modelProvider.id) {
              return {
                ...provider,
                ...(type === 'chat'
                  ? {
                    chatModels: provider.chatModels.filter(
                      (m) => m.key !== modelKey,
                    ),
                  }
                  : {}),
              };
            }
            return provider;
          }) as ConfigModelProvider[],
      );

      toast.success('Model deleted successfully.');
    } catch (err) {
      console.error('Failed to delete model', err);
      toast.error('Failed to delete model.');
    }
  };

  const modelCount =
    modelProvider.chatModels.filter((m) => m.key !== 'error').length;
  const hasError =
    modelProvider.chatModels.some((m) => m.key === 'error');

  return (
    <div
      key={modelProvider.id}
      className="border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden bg-light-primary dark:bg-dark-primary"
    >
      <div className="px-5 py-3.5 flex flex-row justify-between w-full items-center border-b border-light-200 dark:border-dark-200 bg-light-secondary/30 dark:bg-dark-secondary/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          <ProviderIcon providerType={modelProvider.type} size={10} />
          <div className="flex flex-col">
            <p className="text-sm lg:text-sm text-black dark:text-white font-medium">
              {modelProvider.name}
            </p>
            {modelCount > 0 && (
              <p className="text-[10px] lg:text-[11px] text-black/50 dark:text-white/50">
                {modelCount} model{modelCount !== 1 ? 's' : ''} configured
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-row items-center gap-2">
          <TestModelsButton
            providerId={modelProvider.id}
            providerType={modelProvider.type}
            providerName={modelProvider.name}
            apiKey={modelProvider.config?.apiKey || ''}
          />
          <UpdateProvider
            fields={fields}
            modelProvider={modelProvider}
            setProviders={setProviders}
          />
          <DeleteProvider
            modelProvider={modelProvider}
            setProviders={setProviders}
          />
        </div>
      </div>
      <div className="flex flex-col gap-y-4 px-5 py-4">
        <div className="flex flex-col gap-y-2">
          <div className="flex flex-row w-full justify-between items-center">
            <p className="text-[11px] lg:text-[11px] font-medium text-black/70 dark:text-white/70 uppercase tracking-wide">
              Chat Models
            </p>
            {!modelProvider.chatModels.some((m) => m.key === 'error') && (
              <AddModel
                providerId={modelProvider.id}
                setProviders={setProviders}
                type="chat"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {modelProvider.chatModels.some((m) => m.key === 'error') ? (
              <div className="flex flex-row items-center gap-2 text-xs lg:text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 border border-red-200 dark:border-red-900/30">
                <AlertCircle size={16} className="shrink-0" />
                <span className="break-words">
                  {
                    modelProvider.chatModels.find((m) => m.key === 'error')
                      ?.name
                  }
                </span>
              </div>
            ) : modelProvider.chatModels.filter((m) => m.key !== 'error')
              .length === 0 && !hasError ? (
              <div className="flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 border-dashed border-light-200 dark:border-dark-200 bg-light-secondary/20 dark:bg-dark-secondary/20">
                <p className="text-xs text-black/50 dark:text-white/50 text-center">
                  No chat models configured
                </p>
              </div>
            ) : modelProvider.chatModels.filter((m) => m.key !== 'error')
              .length > 0 ? (
              <div className="flex flex-row flex-wrap gap-2">
                {modelProvider.chatModels.map((model, index) => (
                  <div
                    key={`${modelProvider.id}-chat-${model.key}-${index}`}
                    className="flex flex-row items-center space-x-1.5 text-xs lg:text-xs text-black/70 dark:text-white/70 rounded-lg bg-light-secondary dark:bg-dark-secondary px-3 py-1.5 border border-light-200 dark:border-dark-200"
                  >
                    <span>{model.name}</span>
                    <button
                      onClick={() => {
                        handleModelDelete('chat', model.key);
                      }}
                      className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelProvider;

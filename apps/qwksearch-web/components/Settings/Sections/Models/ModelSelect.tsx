import { Select } from '../../../ui/select';
import { ConfigModelProvider } from '../../../../lib/config/types';
import { useChat } from 'research-agent-ui';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ModelSelect = ({
  providers,
  type,
}: {
  providers: ConfigModelProvider[];
  type: 'chat';
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(
    `${localStorage.getItem('chatModelProviderId')}/${localStorage.getItem('chatModelKey')}`,
  );
  const [loading, setLoading] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const { setChatModelProvider } = useChat();

  // Stay in sync when the model is changed elsewhere (e.g. the families carousel)
  useEffect(() => {
    const syncFromStorage = () =>
      setSelectedModel(
        `${localStorage.getItem('chatModelProviderId')}/${localStorage.getItem('chatModelKey')}`,
      );
    window.addEventListener('chat-model-changed', syncFromStorage);
    return () =>
      window.removeEventListener('chat-model-changed', syncFromStorage);
  }, []);

  const handleSave = async (newValue: string) => {
    setLoading(true);
    setSelectedModel(newValue);

    try {
      const providerId = newValue.split('/')[0];
      const modelKey = newValue.split('/').slice(1).join('/');

      localStorage.setItem('chatModelProviderId', providerId);
      localStorage.setItem('chatModelKey', modelKey);

      setChatModelProvider({
        providerId: providerId,
        key: modelKey,
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80">
      {isImageExpanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 cursor-pointer"
          onClick={() => setIsImageExpanded(false)}
        >
          <img
            src="https://i.imgur.com/xMFZZxN.png"
            alt="Expanded view"
            className="max-h-[80vh] max-w-[80vw] object-contain rounded-xl"
          />
        </div>
      )}
      <div className="space-y-3 lg:space-y-5">
        <img
          src="https://i.imgur.com/xMFZZxN.png"
          alt="Thumbnail view"
          className="w-16 h-16 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsImageExpanded(true)}
        />
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            Select Chat Model
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            Choose which model to use for generating responses
          </p>
        </div>
        <select
          value={selectedModel}
          onChange={(event) => handleSave(event.target.value)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs lg:text-[13px] shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        >
          {providers.flatMap((provider) =>
            provider.chatModels.map((model) => (
              <option key={`${provider.id}/${model.key}`} value={`${provider.id}/${model.key}`}>
                {provider.name} - {model.name}
              </option>
            )),
          )}
        </select>
      </div>
    </section>
  );
};

export default ModelSelect;

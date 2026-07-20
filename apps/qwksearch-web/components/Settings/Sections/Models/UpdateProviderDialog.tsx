import { Loader2, Pencil } from 'lucide-react';
import { updateProvider } from 'qwksearch-api-client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  ConfigModelProvider,
  StringUIConfigField,
  UIConfigField,
} from '../../../../lib/config/types';
import { toast } from 'sonner';

const UpdateProvider = ({
  modelProvider,
  fields,
  setProviders,
}: {
  fields: UIConfigField[];
  modelProvider: ConfigModelProvider;
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const config: Record<string, any> = {};

    fields.forEach((field) => {
      // Don't pre-fill password fields for env-based providers — let users provide their own key
      if (field.type === 'password' && modelProvider.isEnvBased) {
        config[field.key] = '';
      } else {
        config[field.key] =
          modelProvider.config[field.key] || field.default || '';
      }
    });

    setConfig(config);
  }, [fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // For env-based providers, fall back to the original stored value for empty password fields
      const resolvedConfig = { ...config };
      if (modelProvider.isEnvBased) {
        fields.forEach((field) => {
          if (field.type === 'password' && !resolvedConfig[field.key]) {
            resolvedConfig[field.key] = modelProvider.config[field.key];
          }
        });
      }

      const response = await updateProvider({
        path: { id: modelProvider.id },
        body: {
          config: resolvedConfig,
        },
      });

      const data: ConfigModelProvider = response.data?.provider || response.provider;

      setProviders((prev) => {
        return prev.map((p) => {
          if (p.id === modelProvider.id) {
            return data;
          }

          return p;
        });
      });

      toast.success('Connection updated successfully.');
    } catch (error) {
      console.error('Error updating provider:', error);
      toast.error('Failed to update connection.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="group p-1.5 rounded-md hover:bg-light-200 hover:dark:bg-dark-200 transition-colors group"
      >
        <Pencil
          size={14}
          className="text-black/60 dark:text-white/60 group-hover:text-black group-hover:dark:text-white"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[600px] max-h-[85vh] flex flex-col border bg-light-primary dark:bg-dark-primary border-light-secondary dark:border-dark-secondary p-0" hideCloseButton>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 pt-6 pb-4">
              <DialogTitle className="text-black/90 dark:text-white/90 font-medium text-sm">
                Update connection
              </DialogTitle>
            </div>
            <div className="border-t border-light-200 dark:border-dark-200" />
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col space-y-4">
                {fields.map((field: UIConfigField) => (
                  <div
                    key={field.key}
                    className="flex flex-col items-start space-y-2"
                  >
                    <label className="text-xs text-black/70 dark:text-white/70">
                      {field.name}
                      {field.required && '*'}
                    </label>
                    <input
                      value={config[field.key] ?? field.default ?? ''}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 pr-10 text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={
                        (field as StringUIConfigField).placeholder
                      }
                      type="text"
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-light-200 dark:border-dark-200" />
            <div className="px-6 py-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-[13px] bg-sky-500 text-white font-medium disabled:opacity-85 hover:opacity-85 active:scale-95 transition duration-200"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  'Update Connection'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateProvider;

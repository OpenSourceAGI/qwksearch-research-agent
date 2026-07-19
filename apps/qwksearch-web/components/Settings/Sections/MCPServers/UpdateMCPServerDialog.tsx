import { Loader2, Pencil } from 'lucide-react';
import grab from 'grab-url';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  MCPServerConfig,
  StringUIConfigField,
  UIConfigField,
} from '../../../../lib/config/types';
import { toast } from 'sonner';

const UpdateMCPServer = ({
  mcpServer,
  fields,
  setServers,
}: {
  fields: UIConfigField[];
  mcpServer: MCPServerConfig;
  setServers: React.Dispatch<React.SetStateAction<MCPServerConfig[]>>;
}) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [name, setName] = useState(mcpServer.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const config: Record<string, any> = {
      name: mcpServer.name,
    };

    fields.forEach((field) => {
      config[field.key] = mcpServer.config[field.key] || field.default || '';
    });

    setConfig(config);
  }, [fields, mcpServer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: MCPServerConfig = (
        await grab(`agent/mcpservers/${mcpServer.id}`, {
          method: 'PATCH',
          body: {
            name: name,
            config: config,
          },
        })
      ).server;

      setServers((prev) => {
        return prev.map((s) => {
          if (s.id === mcpServer.id) {
            return data;
          }

          return s;
        });
      });

      toast.success('MCP server updated successfully.');
    } catch (error) {
      console.error('Error updating MCP server:', error);
      toast.error('Failed to update MCP server.');
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
                Update MCP server
              </DialogTitle>
            </div>
            <div className="border-t border-light-200 dark:border-dark-200" />
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col items-start space-y-2">
                  <label className="text-xs text-black/70 dark:text-white/70">
                    Server Name*
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 pr-10 text-sm text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder={'e.g., My OpenConnector Server'}
                    type="text"
                    required={true}
                  />
                </div>

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
                      type={field.type === 'password' ? 'password' : 'text'}
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
                className="px-4 py-2 rounded-lg text-[13px] bg-blue-500 text-white font-medium disabled:opacity-85 hover:opacity-85 active:scale-95 transition duration-200"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  'Update Server'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateMCPServer;

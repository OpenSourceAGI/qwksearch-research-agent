import { Loader2, Plus } from 'lucide-react';
import grab from 'grab-url';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MCPServerConfig,
  MCPServerUISection,
  StringUIConfigField,
  UIConfigField,
} from '../../../../lib/config/types';

import { toast } from 'sonner';

const AddMCPServer = ({
  mcpServers,
  setServers,
}: {
  mcpServers: MCPServerUISection[];
  setServers: React.Dispatch<React.SetStateAction<MCPServerConfig[]>>;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<null | string>(
    mcpServers[0]?.key || null,
  );
  const [config, setConfig] = useState<Record<string, any>>({});
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const serverConfigMap = useMemo(() => {
    const map: Record<string, { name: string; fields: UIConfigField[] }> = {};

    mcpServers.forEach((s) => {
      map[s.key] = {
        name: s.name,
        fields: s.fields,
      };
    });

    return map;
  }, [mcpServers]);

  const selectedServerFields = useMemo(() => {
    if (!selectedServer) return [];
    const serverFields = serverConfigMap[selectedServer]?.fields || [];
    const config: Record<string, any> = {};

    serverFields.forEach((field) => {
      config[field.key] = field.default || '';
    });

    setConfig(config);

    return serverFields;
  }, [selectedServer, serverConfigMap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: MCPServerConfig = (
        await grab('agent/mcpservers', {
          method: 'POST',
          body: {
            type: selectedServer,
            name: name,
            config: config,
          },
        })
      ).server;

      setServers((prev) => [...prev, data]);

      toast.success('MCP server added successfully.');
    } catch (error) {
      console.error('Error adding MCP server:', error);
      toast.error('Failed to add MCP server.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs sm:text-xs border border-light-200 dark:border-dark-200 text-black dark:text-white bg-light-secondary/50 dark:bg-dark-secondary/50 hover:bg-light-secondary hover:dark:bg-dark-secondary hover:border-light-300 hover:dark:border-dark-300 flex flex-row items-center space-x-1 active:scale-95 transition duration-200"
      >
        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span>Add Server</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[600px] max-h-[85vh] flex flex-col border bg-light-primary dark:bg-dark-primary border-light-secondary dark:border-dark-secondary p-0" hideCloseButton>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="px-6 pt-6 pb-4">
              <DialogTitle className="text-black/90 dark:text-white/90 font-medium text-sm">
                Add new MCP server
              </DialogTitle>
            </div>
            <div className="border-t border-light-200 dark:border-dark-200" />
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col items-start space-y-2">
                  <label className="text-xs text-black/70 dark:text-white/70">
                    Select server type
                  </label>
                  <select
                    value={selectedServer ?? ''}
                    onChange={(e) => setSelectedServer(e.target.value)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {Object.entries(serverConfigMap).map(
                      ([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div
                  key="name"
                  className="flex flex-col items-start space-y-2"
                >
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

                {selectedServerFields.map((field: UIConfigField) => (
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
                  'Add Server'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddMCPServer;

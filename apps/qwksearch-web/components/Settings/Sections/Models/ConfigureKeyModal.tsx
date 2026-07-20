import { ExternalLink, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const ConfigureKeyModal = ({
  open,
  onOpenChange,
  providerName,
  keyUrl,
  docsUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  keyUrl: string;
  docsUrl?: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[500px] border bg-light-primary dark:bg-dark-primary border-light-secondary dark:border-dark-secondary p-0" hideCloseButton>
        <div className="flex flex-col">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <DialogTitle className="text-black/90 dark:text-white/90 font-medium text-sm">
              Configure {providerName} API Key
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="border-t border-light-200 dark:border-dark-200" />
          <div className="px-6 py-4 flex flex-col gap-4">
            <p className="text-[13px] text-black/70 dark:text-white/70">
              To use {providerName} models, you'll need to provide an API key.
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15 transition-colors text-[13px] font-medium"
              >
                <span>Get API Key</span>
                <ExternalLink size={14} className="flex-shrink-0" />
              </a>

              {docsUrl && (
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 hover:bg-light-secondary/50 dark:hover:bg-dark-secondary/50 transition-colors text-[13px] font-medium"
                >
                  <span>View Documentation</span>
                  <ExternalLink size={14} className="flex-shrink-0" />
                </a>
              )}
            </div>

            <div className="rounded-lg bg-light-secondary/30 dark:bg-dark-secondary/30 border border-light-200 dark:border-dark-200 px-4 py-3">
              <p className="text-[11px] text-black/60 dark:text-white/60">
                After obtaining your key, go to the Manage connections section and update your {providerName} provider configuration with the API key.
              </p>
            </div>
          </div>
          <div className="border-t border-light-200 dark:border-dark-200" />
          <div className="px-6 py-4 flex justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg text-[13px] text-black/70 dark:text-white/70 bg-light-secondary/50 dark:bg-dark-secondary/50 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors border border-light-200 dark:border-dark-200"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigureKeyModal;

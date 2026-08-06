/**
 * @fileoverview Popup dialog listing app download links (Chrome extension, Windows app), opened from the "Downloads" footer link instead of being shown inline on the homepage.
 */
'use client';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { researchAgentUIConfig } from '../../config';
import { DownloadAppButton } from 'react-native-app-buttons';

interface DownloadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DownloadsDialog({ open, onOpenChange }: DownloadsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-center align-middle shadow-xl">
        <DialogTitle className="text-lg font-medium leading-6 dark:text-white">
          Download QwkSearch
        </DialogTitle>
        <DialogDescription className="text-sm dark:text-white/70 text-black/70 mt-2">
          Get QwkSearch on your browser or desktop.
        </DialogDescription>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <DownloadAppButton
            platform="chrome-extension"
            href={researchAgentUIConfig.downloadChromeUrl}
            autoHighlight
          />
          <DownloadAppButton
            platform="windows"
            appId={researchAgentUIConfig.downloadWindowsStoreId}
            autoHighlight
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

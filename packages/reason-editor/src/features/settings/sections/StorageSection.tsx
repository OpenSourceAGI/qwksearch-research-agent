/**
 * @module StorageSection
 * @description Settings panel for configuring document storage: toggles
 * local-only vs. database-sync mode. Rendered as one tab inside the
 * Settings dialog.
 */
import { Info, HardDrive, Database } from 'lucide-react';
import { Label } from '../../../app-ui/label';
import { Separator } from '../../../app-ui/separator';

interface StorageSectionProps {
  enableDatabaseSync?: boolean;
  onEnableDatabaseSyncChange?: (enabled: boolean) => void;
}

export const StorageSection = ({ enableDatabaseSync = false, onEnableDatabaseSyncChange }: StorageSectionProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold mb-2">Storage</h2>
      <p className="text-sm text-muted-foreground">Manage how your documents are stored</p>
    </div>

    <Separator />

    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Label className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Sync
          </Label>
          <p className="text-sm text-muted-foreground">
            Save documents to SQL database for persistent storage
          </p>
        </div>
        <input
          type="checkbox"
          id="database-sync"
          checked={enableDatabaseSync}
          onChange={(e) => onEnableDatabaseSyncChange?.(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>

      {enableDatabaseSync ? (
        <div className="rounded-md bg-muted p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Database Sync Enabled</p>
              <p className="text-xs text-muted-foreground">
                Your documents will be automatically saved to the database. Changes are synced every 2 seconds after editing.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-muted p-3 space-y-2">
          <div className="flex items-start gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Local Storage Only</p>
              <p className="text-xs text-muted-foreground">
                Your documents are stored in your browser's local storage. They won't be accessible from other devices.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

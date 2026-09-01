/**
 * @module fileSourceUtils
 * @description Helper functions for resolving file-source display icons and
 * human-readable type labels used in the sidebar file-source dropdown.
 */
import { HardDrive, Server, Cloud, Database, FileText, Workflow } from 'lucide-react';

export const getSourceIcon = (type: string) => {
  switch (type) {
    case 'local':
      return <HardDrive className="h-3.5 w-3.5" />;
    case 'ssh':
      return <Server className="h-3.5 w-3.5" />;
    case 's3':
      return <Cloud className="h-3.5 w-3.5" />;
    case 'r2':
      return <Database className="h-3.5 w-3.5" />;
    case 'gdocs':
      return <FileText className="h-3.5 w-3.5" />;
    case 'turso':
      return <Workflow className="h-3.5 w-3.5" />;
    default:
      return <HardDrive className="h-3.5 w-3.5" />;
  }
};

export const getSourceTypeLabel = (type: string) => {
  switch (type) {
    case 'local':
      return 'Local';
    case 'ssh':
      return 'SSH';
    case 's3':
      return 'S3';
    case 'r2':
      return 'R2';
    case 'gdocs':
      return 'Google Docs';
    case 'turso':
      return 'Turso DB';
    default:
      return type;
  }
};

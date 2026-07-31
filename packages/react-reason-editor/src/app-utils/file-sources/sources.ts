/**
 * @module app-utils/file-sources/sources
 * @description CRUD helpers for AnyFileSource records stored in
 * localStorage. Manages the active source ID and provides typed
 * get/add/update/delete operations.
 */
// File source management utilities

import { FileSource, AnyFileSource } from '../../app-types/fileSource';

const STORAGE_KEY = 'REASON-file-sources';
const ACTIVE_SOURCE_KEY = 'REASON-active-file-source';

// Default local file source
const defaultLocalSource: FileSource = {
  id: 'local-default',
  name: 'Local Files',
  type: 'local',
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Get all file sources from localStorage
 */
export function getFileSources(): AnyFileSource[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sources = JSON.parse(stored);
      // Ensure local default exists
      const hasLocal = sources.some((s: FileSource) => s.id === 'local-default');
      if (!hasLocal) {
        return [defaultLocalSource, ...sources];
      }
      return sources;
    }
  } catch (error) {
    console.error('Error loading file sources:', error);
  }
  return [defaultLocalSource] as AnyFileSource[];
}

/**
 * Save file sources to localStorage
 */
export function saveFileSources(sources: AnyFileSource[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch (error) {
    console.error('Error saving file sources:', error);
  }
}

/**
 * Add a new file source
 */
export function addFileSource(source: Omit<AnyFileSource, 'id' | 'createdAt' | 'updatedAt'>): AnyFileSource {
  const newSource: AnyFileSource = {
    ...source,
    id: `${source.type}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as AnyFileSource;

  const sources = getFileSources();
  const updatedSources = [...sources, newSource];
  saveFileSources(updatedSources);
  return newSource;
}

/**
 * Update an existing file source
 */
export function updateFileSource(id: string, updates: Partial<AnyFileSource>): void {
  const sources = getFileSources();
  const updatedSources = sources.map((source) =>
    source.id === id
      ? { ...source, ...updates, updatedAt: new Date().toISOString() }
      : source
  );
  saveFileSources(updatedSources as AnyFileSource[]);
}

/**
 * Delete a file source
 */
export function deleteFileSource(id: string): void {
  // Don't allow deleting the default local source
  if (id === 'local-default') {
    console.warn('Cannot delete default local source');
    return;
  }

  const sources = getFileSources();
  const updatedSources = sources.filter((source) => source.id !== id);
  saveFileSources(updatedSources);

  // If we deleted the active source, switch to local
  const activeSourceId = getActiveFileSourceId();
  if (activeSourceId === id) {
    setActiveFileSourceId('local-default');
  }
}

/**
 * Get the currently active file source ID
 */
export function getActiveFileSourceId(): string {
  try {
    return localStorage.getItem(ACTIVE_SOURCE_KEY) || 'local-default';
  } catch (error) {
    console.error('Error getting active file source:', error);
    return 'local-default';
  }
}

/**
 * Set the active file source ID
 */
export function setActiveFileSourceId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SOURCE_KEY, id);
  } catch (error) {
    console.error('Error setting active file source:', error);
  }
}

/**
 * Get the currently active file source
 */
export function getActiveFileSource(): AnyFileSource {
  const sources = getFileSources();
  const activeId = getActiveFileSourceId();
  return sources.find((s) => s.id === activeId) || (defaultLocalSource as AnyFileSource);
}

/**
 * Test connection to a file source (placeholder - would need backend implementation)
 */
export async function testFileSourceConnection(source: AnyFileSource): Promise<boolean> {
  // This would need actual implementation with backend API calls
  // For now, return true for local, false for others (not implemented)
  if (source.type === 'local') {
    return true;
  }

  // TODO: Implement actual connection testing via backend API
  console.warn(`Connection testing for ${source.type} not yet implemented`);
  return false;
}

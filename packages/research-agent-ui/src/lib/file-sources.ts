/**
 * @fileoverview localStorage-backed CRUD for configured file sources (local, SSH, S3, R2, B2, Google Docs, Turso).
 *
 * Always guarantees a default "Local Files" source is present and tracks
 * which source is currently active; used by the file browser to let users
 * connect and switch between multiple storage backends.
 */
import { FileSource, AnyFileSource } from '../types/fileSource';

export type { FileSource, AnyFileSource } from '../types/fileSource';
export type { FileSourceType, SSHCredentials, S3Credentials, R2Credentials, B2Credentials, GoogleDocsCredentials, TursoDBCredentials, LocalFileSource, SSHFileSource, S3FileSource, R2FileSource, B2FileSource, GoogleDocsFileSource, TursoDBFileSource } from '../types/fileSource';

const STORAGE_KEY = 'REASON-file-sources';
const ACTIVE_SOURCE_KEY = 'REASON-active-file-source';

const defaultLocalSource: FileSource = {
  id: 'local-default',
  name: 'Local Files',
  type: 'local',
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function getFileSources(): AnyFileSource[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sources = JSON.parse(stored);
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

export function saveFileSources(sources: AnyFileSource[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch (error) {
    console.error('Error saving file sources:', error);
  }
}

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

export function updateFileSource(id: string, updates: Partial<AnyFileSource>): void {
  const sources = getFileSources();
  const updatedSources = sources.map((source) =>
    source.id === id
      ? { ...source, ...updates, updatedAt: new Date().toISOString() }
      : source
  );
  saveFileSources(updatedSources as AnyFileSource[]);
}

export function deleteFileSource(id: string): void {
  if (id === 'local-default') {
    console.warn('Cannot delete default local source');
    return;
  }

  const sources = getFileSources();
  const updatedSources = sources.filter((source) => source.id !== id);
  saveFileSources(updatedSources);

  const activeSourceId = getActiveFileSourceId();
  if (activeSourceId === id) {
    setActiveFileSourceId('local-default');
  }
}

export function getActiveFileSourceId(): string {
  try {
    return localStorage.getItem(ACTIVE_SOURCE_KEY) || 'local-default';
  } catch (error) {
    console.error('Error getting active file source:', error);
    return 'local-default';
  }
}

export function setActiveFileSourceId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SOURCE_KEY, id);
  } catch (error) {
    console.error('Error setting active file source:', error);
  }
}

export function getActiveFileSource(): AnyFileSource {
  const sources = getFileSources();
  const activeId = getActiveFileSourceId();
  return sources.find((s) => s.id === activeId) || (defaultLocalSource as AnyFileSource);
}

export async function testFileSourceConnection(source: AnyFileSource): Promise<boolean> {
  if (source.type === 'local') {
    return true;
  }
  console.warn(`Connection testing for ${source.type} not yet implemented`);
  return false;
}

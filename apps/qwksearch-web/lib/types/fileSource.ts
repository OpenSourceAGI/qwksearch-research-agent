// File source types for different storage backends

export type FileSourceType = 'local' | 'ssh' | 's3' | 'r2' | 'b2' | 'gdocs' | 'turso';

export interface SSHCredentials {
  /** SSH host name or IP address. */
  host: string;
  /** SSH port used for connection. */
  port: number;
  /** SSH user account name. */
  username: string;
  /** Optional password for password-based auth. */
  password?: string;
  /** Optional private key contents for key-based auth. */
  privateKey?: string;
  /** Optional passphrase for the private key. */
  passphrase?: string;
  /** Optional base path used as the root directory. */
  basePath?: string;
}

export interface S3Credentials {
  /** AWS access key ID or S3-compatible key ID. */
  accessKeyId: string;
  /** AWS secret access key or S3-compatible secret. */
  secretAccessKey: string;
  /** Region where the bucket is hosted. */
  region: string;
  /** Bucket name to read/write files from. */
  bucket: string;
  /** Optional custom endpoint for S3-compatible providers. */
  endpoint?: string;
  /** Optional base path prefix inside the bucket. */
  basePath?: string;
}

export interface R2Credentials {
  /** Cloudflare account ID owning the R2 bucket. */
  accountId: string;
  /** R2 access key ID. */
  accessKeyId: string;
  /** R2 secret access key. */
  secretAccessKey: string;
  /** R2 bucket name. */
  bucket: string;
  /** Optional path prefix inside the bucket. */
  basePath?: string;
}

export interface B2Credentials {
  /** Backblaze access key ID. */
  accessKeyId: string;
  /** Backblaze secret access key. */
  secretAccessKey: string;
  /** Backblaze B2 bucket name. */
  bucket: string;
  endpoint?: string; // e.g., https://s3.us-west-004.backblazeb2.com
  /** Optional path prefix inside the bucket. */
  basePath?: string;
}

export interface GoogleDocsCredentials {
  /** OAuth access token for Google API requests. */
  accessToken?: string;
  /** OAuth refresh token to renew expired access tokens. */
  refreshToken?: string;
  /** Connected Google account email. */
  email?: string;
  folderIds?: string[]; // Array of Google Drive folder IDs to sync
  /** Indicates whether the Google connection is active. */
  isAuthenticated: boolean;
}

export interface TursoDBCredentials {
  /** Turso database endpoint URL. */
  endpoint: string;
  /** Optional Turso auth token for protected instances. */
  authToken?: string;
  /** Optional database name when endpoint hosts multiple DBs. */
  database?: string;
  enableGoogleDocsSync?: boolean; // If true, Turso DB is used to enable Google Docs sync
}

export interface FileSource {
  /** Unique source identifier. */
  id: string;
  /** Human-readable source label shown in UI. */
  name: string;
  /** Source backend type discriminator. */
  type: FileSourceType;
  /** Backend-specific connection credentials. */
  credentials?: SSHCredentials | S3Credentials | R2Credentials | B2Credentials | GoogleDocsCredentials | TursoDBCredentials;
  /** Marks this source as the default selection. */
  isDefault?: boolean;
  /** ISO timestamp when the source was created. */
  createdAt: string;
  /** ISO timestamp when the source was last updated. */
  updatedAt: string;
}

export interface LocalFileSource extends FileSource {
  type: 'local';
  credentials: undefined;
}

export interface SSHFileSource extends FileSource {
  type: 'ssh';
  credentials: SSHCredentials;
}

export interface S3FileSource extends FileSource {
  type: 's3';
  credentials: S3Credentials;
}

export interface R2FileSource extends FileSource {
  type: 'r2';
  credentials: R2Credentials;
}

export interface B2FileSource extends FileSource {
  type: 'b2';
  credentials: B2Credentials;
}

export interface GoogleDocsFileSource extends FileSource {
  type: 'gdocs';
  credentials: GoogleDocsCredentials;
}

export interface TursoDBFileSource extends FileSource {
  type: 'turso';
  credentials: TursoDBCredentials;
}

export type AnyFileSource = LocalFileSource | SSHFileSource | S3FileSource | R2FileSource | B2FileSource | GoogleDocsFileSource | TursoDBFileSource;

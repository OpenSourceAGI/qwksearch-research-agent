/**
 * @module FileSourcesSection
 * @description Settings panel for managing external file sources (SSH, S3, R2,
 * B2, Google Docs, Turso DB). Handles create/edit/delete with an inline form.
 * Rendered as one tab inside the Settings dialog.
 */
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, HardDrive, Server, Cloud, Database, FileText, Workflow, LogIn } from 'lucide-react';
import { Label } from '../../../app-ui/label';
import { Separator } from '../../../app-ui/separator';
import { Button } from '../../../app-ui/button';
import { Input } from '../../../app-ui/input';
import { Textarea } from '../../../app-ui/textarea';
import { Badge } from '../../../app-ui/badge';
import {
  getFileSources,
  addFileSource,
  updateFileSource,
  deleteFileSource,
  AnyFileSource,
  FileSourceType,
  SSHCredentials,
  S3Credentials,
  R2Credentials,
  B2Credentials,
  GoogleDocsCredentials,
  TursoDBCredentials,
} from 'react-reason-editor-sidebar';
import { toast } from 'sonner';

interface FileSourcesSectionProps {
  /** Whether the parent dialog is open; triggers a reload of sources when it opens. */
  open: boolean;
}

type SourceForm = {
  name: string;
  type: FileSourceType;
  credentials: Partial<SSHCredentials & S3Credentials & R2Credentials & B2Credentials & GoogleDocsCredentials & TursoDBCredentials>;
};

const emptyForm: SourceForm = { name: '', type: 'local', credentials: {} };

export const FileSourcesSection = ({ open }: FileSourcesSectionProps) => {
  const [fileSources, setFileSources] = useState<AnyFileSource[]>([]);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceForm>(emptyForm);

  useEffect(() => {
    if (open) setFileSources(getFileSources());
  }, [open]);

  const handleSave = () => {
    if (!sourceForm.name.trim()) { toast.error('Please enter a source name'); return; }

    if (editingSource && editingSource !== 'new') {
      updateFileSource(editingSource, {
        name: sourceForm.name,
        credentials: sourceForm.type !== 'local' ? sourceForm.credentials : undefined,
      } as Partial<AnyFileSource>);
      toast.success('Source updated');
    } else {
      addFileSource({ name: sourceForm.name, type: sourceForm.type, credentials: sourceForm.type !== 'local' ? sourceForm.credentials : undefined } as any);
      toast.success('Source added');
    }

    setFileSources(getFileSources());
    setEditingSource(null);
    setSourceForm(emptyForm);
  };

  const handleDelete = (id: string) => {
    deleteFileSource(id);
    setFileSources(getFileSources());
    toast.success('Source deleted');
  };

  const startEditing = (source: AnyFileSource) => {
    setEditingSource(source.id);
    setSourceForm({ name: source.name, type: source.type, credentials: source.credentials || {} });
  };

  const cancel = () => { setEditingSource(null); setSourceForm(emptyForm); };

  const cred = <K extends keyof SourceForm['credentials']>(key: K) => sourceForm.credentials[key] as any;
  const setCred = (patch: Partial<SourceForm['credentials']>) =>
    setSourceForm((f) => ({ ...f, credentials: { ...f.credentials, ...patch } }));

  const SourceIcon = ({ type }: { type: string }) => {
    if (type === 'local') return <HardDrive className="h-4 w-4" />;
    if (type === 'ssh') return <Server className="h-4 w-4" />;
    if (type === 's3' || type === 'b2') return <Cloud className="h-4 w-4" />;
    if (type === 'r2') return <Database className="h-4 w-4" />;
    if (type === 'gdocs') return <FileText className="h-4 w-4" />;
    if (type === 'turso') return <Workflow className="h-4 w-4" />;
    return null;
  };

  const sourceLabel = (type: string) =>
    type === 'gdocs' ? 'Google Docs' : type === 'turso' ? 'Turso DB' : type === 'b2' ? 'Backblaze B2' : type.toUpperCase();

  const renderCredFields = (type: FileSourceType) => {
    if (type === 'ssh') return (
      <>
        <Field label="Host"><Input value={cred('host') || ''} onChange={(e) => setCred({ host: e.target.value })} placeholder="example.com" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Port"><Input type="number" value={cred('port') || 22} onChange={(e) => setCred({ port: parseInt(e.target.value) })} placeholder="22" /></Field>
          <Field label="Username"><Input value={cred('username') || ''} onChange={(e) => setCred({ username: e.target.value })} placeholder="user" /></Field>
        </div>
        <Field label="Password (Optional)"><Input type="password" value={cred('password') || ''} onChange={(e) => setCred({ password: e.target.value })} placeholder="••••••••" /></Field>
        <Field label="Base Path (Optional)"><Input value={cred('basePath') || ''} onChange={(e) => setCred({ basePath: e.target.value })} placeholder="/home/user/documents" /></Field>
      </>
    );
    if (type === 's3') return (
      <>
        <Field label="Access Key ID"><Input value={cred('accessKeyId') || ''} onChange={(e) => setCred({ accessKeyId: e.target.value })} placeholder="AKIAIOSFODNN7EXAMPLE" /></Field>
        <Field label="Secret Access Key"><Input type="password" value={cred('secretAccessKey') || ''} onChange={(e) => setCred({ secretAccessKey: e.target.value })} placeholder="••••••••" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Region"><Input value={cred('region') || ''} onChange={(e) => setCred({ region: e.target.value })} placeholder="us-east-1" /></Field>
          <Field label="Bucket"><Input value={cred('bucket') || ''} onChange={(e) => setCred({ bucket: e.target.value })} placeholder="my-bucket" /></Field>
        </div>
      </>
    );
    if (type === 'r2') return (
      <>
        <Field label="Account ID"><Input value={cred('accountId') || ''} onChange={(e) => setCred({ accountId: e.target.value })} placeholder="your-account-id" /></Field>
        <Field label="Access Key ID"><Input value={cred('accessKeyId') || ''} onChange={(e) => setCred({ accessKeyId: e.target.value })} placeholder="your-access-key-id" /></Field>
        <Field label="Secret Access Key"><Input type="password" value={cred('secretAccessKey') || ''} onChange={(e) => setCred({ secretAccessKey: e.target.value })} placeholder="••••••••" /></Field>
        <Field label="Bucket"><Input value={cred('bucket') || ''} onChange={(e) => setCred({ bucket: e.target.value })} placeholder="my-bucket" /></Field>
      </>
    );
    if (type === 'b2') return (
      <>
        <Field label="Access Key ID"><Input value={cred('accessKeyId') || ''} onChange={(e) => setCred({ accessKeyId: e.target.value })} placeholder="your-key-id" /></Field>
        <Field label="Secret Access Key"><Input type="password" value={cred('secretAccessKey') || ''} onChange={(e) => setCred({ secretAccessKey: e.target.value })} placeholder="••••••••" /></Field>
        <Field label="Bucket"><Input value={cred('bucket') || ''} onChange={(e) => setCred({ bucket: e.target.value })} placeholder="my-bucket" /></Field>
        <Field label="Endpoint (Optional)"><Input value={cred('endpoint') || ''} onChange={(e) => setCred({ endpoint: e.target.value })} placeholder="https://s3.us-west-004.backblazeb2.com" /></Field>
      </>
    );
    if (type === 'gdocs') return (
      <>
        <Field label="Email"><Input value={cred('email') || ''} onChange={(e) => setCred({ email: e.target.value })} placeholder="user@gmail.com" disabled /></Field>
        <Field label="Folder IDs (comma-separated)">
          <Textarea value={(cred('folderIds') as string[] | undefined)?.join(', ') || ''} onChange={(e) => setCred({ folderIds: e.target.value.split(',').map((id) => id.trim()).filter(Boolean) })} placeholder="folder-id-1, folder-id-2" rows={3} />
          <p className="text-xs text-muted-foreground">Enter Google Drive folder IDs to sync (one per line or comma-separated)</p>
        </Field>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <div className="flex-1"><p className="text-sm font-medium">{cred('isAuthenticated') ? 'Connected to Google' : 'Not authenticated'}</p></div>
          <Button size="sm" variant="outline"><LogIn className="h-4 w-4 mr-2" />{cred('isAuthenticated') ? 'Reconnect' : 'Authenticate'}</Button>
        </div>
      </>
    );
    if (type === 'turso') return (
      <>
        <Field label="Database Endpoint"><Input value={cred('endpoint') || ''} onChange={(e) => setCred({ endpoint: e.target.value })} placeholder="https://your-db.turso.io" /></Field>
        <Field label="Auth Token (Optional)"><Input type="password" value={cred('authToken') || ''} onChange={(e) => setCred({ authToken: e.target.value })} placeholder="••••••••" /></Field>
        <Field label="Database Name (Optional)"><Input value={cred('database') || ''} onChange={(e) => setCred({ database: e.target.value })} placeholder="my-database" /></Field>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="gdocs-sync" checked={cred('enableGoogleDocsSync') || false} onChange={(e) => setCred({ enableGoogleDocsSync: e.target.checked })} className="h-4 w-4" />
          <Label htmlFor="gdocs-sync" className="cursor-pointer">Enable Google Docs Sync</Label>
        </div>
        {cred('enableGoogleDocsSync') && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <div className="flex-1"><p className="text-sm">Authenticate with Google to sync documents</p></div>
            <Button size="sm" variant="outline"><LogIn className="h-4 w-4 mr-2" />Login with Google</Button>
          </div>
        )}
      </>
    );
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">File Sources</h2>
        <p className="text-sm text-muted-foreground">Manage storage sources (SSH, S3, R2, B2, Google Docs, Turso DB)</p>
      </div>

      <Separator />

      <div className="space-y-3">
        {fileSources.map((source) => (
          <div key={source.id} className="border rounded-lg p-3 space-y-2">
            {editingSource === source.id ? (
              <div className="space-y-3">
                <Field label="Source Name"><Input value={sourceForm.name} onChange={(e) => setSourceForm((f) => ({ ...f, name: e.target.value }))} placeholder="My Remote Files" /></Field>
                {renderCredFields(source.type)}
                <SaveCancelButtons onSave={handleSave} onCancel={cancel} label="Save" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SourceIcon type={source.type} />
                    <span className="font-medium">{source.name}</span>
                    <Badge variant="outline" className="text-xs">{sourceLabel(source.type)}</Badge>
                  </div>
                  {source.id !== 'local-default' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditing(source)}><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(source.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
                <SourceSummary source={source} />
              </div>
            )}
          </div>
        ))}

        {editingSource === 'new' && (
          <div className="border rounded-lg p-3 space-y-3">
            <Field label="Source Name"><Input value={sourceForm.name} onChange={(e) => setSourceForm((f) => ({ ...f, name: e.target.value }))} placeholder="My Remote Files" /></Field>
            <Field label="Source Type">
              <select value={sourceForm.type} onChange={(e) => { const t = e.target.value as FileSourceType; setSourceForm({ name: sourceForm.name, type: t, credentials: t === 'gdocs' ? { isAuthenticated: false } : {} }); }} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="ssh">SSH</option>
                <option value="s3">Amazon S3</option>
                <option value="r2">Cloudflare R2</option>
                <option value="b2">Backblaze B2</option>
                <option value="gdocs">Google Docs</option>
                <option value="turso">Turso DB</option>
              </select>
            </Field>
            {renderCredFields(sourceForm.type)}
            <SaveCancelButtons onSave={handleSave} onCancel={cancel} label="Add Source" />
          </div>
        )}
      </div>

      {editingSource !== 'new' && (
        <Button variant="outline" size="sm" onClick={() => { setEditingSource('new'); setSourceForm({ name: '', type: 'ssh', credentials: { port: 22 } }); }} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New File Source
        </Button>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

const SaveCancelButtons = ({ onSave, onCancel, label }: { onSave: () => void; onCancel: () => void; label: string }) => (
  <div className="flex gap-2">
    <Button size="sm" onClick={onSave}>{label}</Button>
    <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
  </div>
);

const SourceSummary = ({ source }: { source: AnyFileSource }) => {
  if (source.type === 'ssh' && source.credentials) {
    const c = source.credentials as SSHCredentials;
    return <p className="text-xs text-muted-foreground">{c.username}@{c.host}:{c.port || 22}</p>;
  }
  if (source.type === 's3' && source.credentials) {
    const c = source.credentials as S3Credentials;
    return <p className="text-xs text-muted-foreground">{c.bucket} ({c.region})</p>;
  }
  if (source.type === 'r2' && source.credentials) {
    const c = source.credentials as R2Credentials;
    return <p className="text-xs text-muted-foreground">{c.bucket}</p>;
  }
  if (source.type === 'b2' && source.credentials) {
    const c = source.credentials as B2Credentials;
    return <p className="text-xs text-muted-foreground">{c.bucket} ({c.endpoint || 'default endpoint'})</p>;
  }
  if (source.type === 'gdocs' && source.credentials) {
    const c = source.credentials as GoogleDocsCredentials;
    return <p className="text-xs text-muted-foreground">{c.isAuthenticated ? `${c.email || 'Authenticated'} - ${c.folderIds?.length || 0} folder(s)` : 'Not authenticated'}</p>;
  }
  if (source.type === 'turso' && source.credentials) {
    const c = source.credentials as TursoDBCredentials;
    return <p className="text-xs text-muted-foreground">{c.endpoint}{c.enableGoogleDocsSync && ' (Google Docs sync enabled)'}</p>;
  }
  return null;
};

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  HardDrive,
  Server,
  Cloud,
  Database,
  FileText,
  Workflow,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
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
} from 'research-agent-ui/file-sources';

const SOURCE_TYPE_OPTIONS: { value: FileSourceType; label: string }[] = [
  { value: 'ssh', label: 'SSH' },
  { value: 's3', label: 'Amazon S3' },
  { value: 'r2', label: 'Cloudflare R2' },
  { value: 'b2', label: 'Backblaze B2' },
  { value: 'gdocs', label: 'Google Docs' },
  { value: 'turso', label: 'Turso DB' },
];

function sourceTypeLabel(type: FileSourceType) {
  if (type === 'gdocs') return 'Google Docs';
  if (type === 'turso') return 'Turso DB';
  if (type === 'b2') return 'Backblaze B2';
  return type.toUpperCase();
}

function SourceIcon({ type }: { type: FileSourceType }) {
  const cls = 'h-4 w-4 flex-shrink-0';
  if (type === 'local') return <HardDrive className={cls} />;
  if (type === 'ssh') return <Server className={cls} />;
  if (type === 's3') return <Cloud className={cls} />;
  if (type === 'r2') return <Database className={cls} />;
  if (type === 'b2') return <Cloud className={cls} />;
  if (type === 'gdocs') return <FileText className={cls} />;
  return <Workflow className={cls} />;
}

type SourceForm = {
  name: string;
  type: FileSourceType;
  credentials: Partial<SSHCredentials & S3Credentials & R2Credentials & B2Credentials & GoogleDocsCredentials & TursoDBCredentials>;
};

const emptyForm = (type: FileSourceType = 'ssh'): SourceForm => ({
  name: '',
  type,
  credentials: type === 'gdocs' ? { isAuthenticated: false } : type === 'ssh' ? { port: 22 } : {},
});

const inputCls =
  'w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-3 py-2 text-sm text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors';

const labelCls = 'text-xs text-black/70 dark:text-white/70 mb-1 block';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col space-y-1">
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

function SSHFields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  const c = (form.credentials as SSHCredentials) || {};
  const set = (patch: Partial<SSHCredentials>) =>
    setForm({ ...form, credentials: { ...form.credentials, ...patch } });
  return (
    <>
      <Field label="Host">
        <input className={inputCls} value={c.host || ''} onChange={e => set({ host: e.target.value })} placeholder="example.com" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Port">
          <input className={inputCls} type="number" value={c.port ?? 22} onChange={e => set({ port: parseInt(e.target.value) })} placeholder="22" />
        </Field>
        <Field label="Username">
          <input className={inputCls} value={c.username || ''} onChange={e => set({ username: e.target.value })} placeholder="user" />
        </Field>
      </div>
      <Field label="Password (Optional)">
        <input className={inputCls} type="password" value={c.password || ''} onChange={e => set({ password: e.target.value })} placeholder="••••••••" />
      </Field>
      <Field label="Base Path (Optional)">
        <input className={inputCls} value={c.basePath || ''} onChange={e => set({ basePath: e.target.value })} placeholder="/home/user/documents" />
      </Field>
    </>
  );
}

function S3Fields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  const c = (form.credentials as S3Credentials) || {};
  const set = (patch: Partial<S3Credentials>) =>
    setForm({ ...form, credentials: { ...form.credentials, ...patch } });
  return (
    <>
      <Field label="Access Key ID">
        <input className={inputCls} value={c.accessKeyId || ''} onChange={e => set({ accessKeyId: e.target.value })} placeholder="AKIAIOSFODNN7EXAMPLE" />
      </Field>
      <Field label="Secret Access Key">
        <input className={inputCls} type="password" value={c.secretAccessKey || ''} onChange={e => set({ secretAccessKey: e.target.value })} placeholder="••••••••" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Region">
          <input className={inputCls} value={c.region || ''} onChange={e => set({ region: e.target.value })} placeholder="us-east-1" />
        </Field>
        <Field label="Bucket">
          <input className={inputCls} value={c.bucket || ''} onChange={e => set({ bucket: e.target.value })} placeholder="my-bucket" />
        </Field>
      </div>
    </>
  );
}

function R2Fields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  const c = (form.credentials as R2Credentials) || {};
  const set = (patch: Partial<R2Credentials>) =>
    setForm({ ...form, credentials: { ...form.credentials, ...patch } });
  return (
    <>
      <Field label="Account ID">
        <input className={inputCls} value={c.accountId || ''} onChange={e => set({ accountId: e.target.value })} placeholder="your-account-id" />
      </Field>
      <Field label="Access Key ID">
        <input className={inputCls} value={c.accessKeyId || ''} onChange={e => set({ accessKeyId: e.target.value })} placeholder="your-access-key-id" />
      </Field>
      <Field label="Secret Access Key">
        <input className={inputCls} type="password" value={c.secretAccessKey || ''} onChange={e => set({ secretAccessKey: e.target.value })} placeholder="••••••••" />
      </Field>
      <Field label="Bucket">
        <input className={inputCls} value={c.bucket || ''} onChange={e => set({ bucket: e.target.value })} placeholder="my-bucket" />
      </Field>
    </>
  );
}

function B2Fields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  const c = (form.credentials as B2Credentials) || {};
  const set = (patch: Partial<B2Credentials>) =>
    setForm({ ...form, credentials: { ...form.credentials, ...patch } });
  return (
    <>
      <Field label="Access Key ID">
        <input className={inputCls} value={c.accessKeyId || ''} onChange={e => set({ accessKeyId: e.target.value })} placeholder="your-key-id" />
      </Field>
      <Field label="Secret Access Key">
        <input className={inputCls} type="password" value={c.secretAccessKey || ''} onChange={e => set({ secretAccessKey: e.target.value })} placeholder="••••••••" />
      </Field>
      <Field label="Bucket">
        <input className={inputCls} value={c.bucket || ''} onChange={e => set({ bucket: e.target.value })} placeholder="my-bucket" />
      </Field>
      <Field label="Endpoint (Optional)">
        <input className={inputCls} value={c.endpoint || ''} onChange={e => set({ endpoint: e.target.value })} placeholder="https://s3.us-west-004.backblazeb2.com" />
      </Field>
    </>
  );
}

function GDocsFields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  const c = (form.credentials as GoogleDocsCredentials) || {};
  const set = (patch: Partial<GoogleDocsCredentials>) =>
    setForm({ ...form, credentials: { ...form.credentials, ...patch } });
  return (
    <>
      <Field label="Email">
        <input className={inputCls} disabled value={c.email || ''} onChange={e => set({ email: e.target.value })} placeholder="user@gmail.com" />
      </Field>
      <Field label="Folder IDs (comma-separated)">
        <textarea
          className={inputCls}
          rows={3}
          value={c.folderIds?.join(', ') || ''}
          onChange={e =>
            set({ folderIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean) })
          }
          placeholder="folder-id-1, folder-id-2"
        />
      </Field>
      <div className="flex items-center justify-between rounded-lg border border-light-200 dark:border-dark-200 px-3 py-2">
        <p className="text-sm text-black/70 dark:text-white/70">
          {c.isAuthenticated ? 'Connected to Google' : 'Not authenticated'}
        </p>
        <button className="flex items-center gap-1.5 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
          <LogIn size={12} />
          {c.isAuthenticated ? 'Reconnect' : 'Authenticate'}
        </button>
      </div>
    </>
  );
}

function TursoFields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  const c = (form.credentials as TursoDBCredentials) || {};
  const set = (patch: Partial<TursoDBCredentials>) =>
    setForm({ ...form, credentials: { ...form.credentials, ...patch } });
  return (
    <>
      <Field label="Database Endpoint">
        <input className={inputCls} value={c.endpoint || ''} onChange={e => set({ endpoint: e.target.value })} placeholder="https://your-db.turso.io" />
      </Field>
      <Field label="Auth Token (Optional)">
        <input className={inputCls} type="password" value={c.authToken || ''} onChange={e => set({ authToken: e.target.value })} placeholder="••••••••" />
      </Field>
      <Field label="Database Name (Optional)">
        <input className={inputCls} value={c.database || ''} onChange={e => set({ database: e.target.value })} placeholder="my-database" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={c.enableGoogleDocsSync || false}
          onChange={e => set({ enableGoogleDocsSync: e.target.checked })}
          className="h-4 w-4 rounded border-light-200 dark:border-dark-200"
        />
        Enable Google Docs Sync
      </label>
      {c.enableGoogleDocsSync && (
        <div className="flex items-center justify-between rounded-lg border border-light-200 dark:border-dark-200 px-3 py-2">
          <p className="text-sm text-black/70 dark:text-white/70">Authenticate with Google to sync documents</p>
          <button className="flex items-center gap-1.5 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
            <LogIn size={12} />
            Login with Google
          </button>
        </div>
      )}
    </>
  );
}

function CredentialFields({ form, setForm }: { form: SourceForm; setForm: (f: SourceForm) => void }) {
  if (form.type === 'ssh') return <SSHFields form={form} setForm={setForm} />;
  if (form.type === 's3') return <S3Fields form={form} setForm={setForm} />;
  if (form.type === 'r2') return <R2Fields form={form} setForm={setForm} />;
  if (form.type === 'b2') return <B2Fields form={form} setForm={setForm} />;
  if (form.type === 'gdocs') return <GDocsFields form={form} setForm={setForm} />;
  if (form.type === 'turso') return <TursoFields form={form} setForm={setForm} />;
  return null;
}

const FileSources = (_props: { fields?: any; values?: any }) => {
  const [sources, setSources] = useState<AnyFileSource[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm());

  useEffect(() => {
    setSources(getFileSources());
  }, []);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Please enter a source name');
      return;
    }
    if (editingId === 'new') {
      addFileSource({ name: form.name, type: form.type, credentials: form.type !== 'local' ? form.credentials : undefined } as any);
      toast.success('Source added');
    } else if (editingId) {
      updateFileSource(editingId, { name: form.name, credentials: form.type !== 'local' ? form.credentials : undefined } as Partial<AnyFileSource>);
      toast.success('Source updated');
    }
    setSources(getFileSources());
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleDelete = (id: string) => {
    deleteFileSource(id);
    setSources(getFileSources());
    toast.success('Source deleted');
  };

  const startEdit = (source: AnyFileSource) => {
    setEditingId(source.id);
    setForm({ name: source.name, type: source.type, credentials: (source.credentials as any) || {} });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const btnBase = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200';

  return (
    <div className="px-6 py-4 flex flex-col space-y-3 overflow-y-auto">
      {sources.map(source => (
        <div key={source.id} className="rounded-xl border border-light-200 dark:border-dark-200 p-3 space-y-3">
          {editingId === source.id ? (
            <div className="space-y-3">
              <Field label="Source Name">
                <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Remote Files" />
              </Field>
              <CredentialFields form={form} setForm={setForm} />
              <div className="flex gap-2">
                <button onClick={handleSave} className={`${btnBase} bg-blue-500 text-white hover:bg-blue-600`}>Save</button>
                <button onClick={cancelEdit} className={`${btnBase} border border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200`}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-black/50 dark:text-white/50"><SourceIcon type={source.type} /></span>
                <span className="text-sm font-medium text-black/80 dark:text-white/80 truncate">{source.name}</span>
                <span className="text-[10px] rounded px-1.5 py-0.5 border border-light-200 dark:border-dark-200 text-black/50 dark:text-white/50 flex-shrink-0">{sourceTypeLabel(source.type)}</span>
              </div>
              {source.id !== 'local-default' && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(source)} className="p-1.5 rounded hover:bg-light-200 dark:hover:bg-dark-200 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(source.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-black/50 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {editingId === 'new' && (
        <div className="rounded-xl border border-light-200 dark:border-dark-200 p-3 space-y-3">
          <Field label="Source Name">
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Remote Files" />
          </Field>
          <Field label="Source Type">
            <select
              value={form.type}
              onChange={e => {
                const t = e.target.value as FileSourceType;
                setForm(emptyForm(t));
              }}
              className={inputCls}
            >
              {SOURCE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <CredentialFields form={form} setForm={setForm} />
          <div className="flex gap-2">
            <button onClick={handleSave} className={`${btnBase} bg-blue-500 text-white hover:bg-blue-600`}>Add Source</button>
            <button onClick={cancelEdit} className={`${btnBase} border border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200`}>Cancel</button>
          </div>
        </div>
      )}

      {editingId !== 'new' && (
        <button
          onClick={() => { setEditingId('new'); setForm(emptyForm('ssh')); }}
          className={`${btnBase} w-full justify-center border border-dashed border-light-200 dark:border-dark-200 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:border-light-300 dark:hover:border-dark-300 py-2.5`}
        >
          <Plus size={13} />
          Add New File Source
        </button>
      )}
    </div>
  );
};

export default FileSources;

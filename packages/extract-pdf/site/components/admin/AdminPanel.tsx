'use client';

/**
 * The admin panel: a password login, then one field per global key
 * (`worker/admin.ts` → `SETTINGS`). A blank secret field leaves the saved key
 * alone; "Clear" removes it. Secrets are never sent back to the page, only a
 * `…abcd` tail.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import type { AdminSettingsResponse, SettingState } from '../../worker/admin';

type Status = { text: string; error?: boolean };

async function call(path: string, init?: RequestInit): Promise<AdminSettingsResponse & { error?: string; ok?: boolean }> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as AdminSettingsResponse & { error?: string };
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  return body;
}

export function AdminPanel() {
  const [settings, setSettings] = useState<SettingState[] | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ text: '' });

  const load = useCallback(async () => {
    try {
      setSettings((await call('/api/admin/settings')).settings);
    } catch (err) {
      setSettings(null);
      if ((err as { status?: number }).status === 503) setStatus({ text: (err as Error).message, error: true });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus({ text: '' });
    try {
      await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword('');
      await load();
    } catch (err) {
      setStatus({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await call('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    setSettings(null);
    setDrafts({});
    setStatus({ text: '' });
  };

  const save = async (changes: Record<string, string | null>, done: string) => {
    setBusy(true);
    setStatus({ text: '' });
    try {
      setSettings((await call('/api/admin/settings', { method: 'PUT', body: JSON.stringify(changes) })).settings);
      setDrafts({});
      setStatus({ text: done });
    } catch (err) {
      if ((err as { status?: number }).status === 401) setSettings(null);
      setStatus({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Only fields the admin touched; a blank secret keeps the saved key.
    const changes: Record<string, string | null> = {};
    for (const item of settings ?? []) {
      const draft = drafts[item.name];
      if (draft === undefined) continue;
      if (draft.trim() || !item.secret) changes[item.name] = draft.trim() || null;
    }
    if (!Object.keys(changes).length) return setStatus({ text: 'Nothing to save.' });
    void save(changes, 'Saved.');
  };

  return (
    <div className="epd-demo">
      <main className="page">
        <header className="header">
          <h1>Admin</h1>
          <p>Global keys for this site. A value saved here is used instead of the one in the Worker’s dashboard.</p>
        </header>

        {checking ? (
          <p className="status">Loading…</p>
        ) : !settings ? (
          <form className="panel" onSubmit={login} style={{ marginTop: 24 }}>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="row">
              <button className="primary" type="submit" disabled={busy || !password}>
                Sign in
              </button>
            </div>
          </form>
        ) : (
          <form className="panel" onSubmit={submit} style={{ marginTop: 24 }}>
            {settings.map((item) => (
              <div key={item.name}>
                <label htmlFor={item.name} style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {item.label} <code>{item.name}</code>
                </label>
                <div className="row">
                  <input
                    id={item.name}
                    style={{ flex: 1, minWidth: 220 }}
                    type={item.secret ? 'password' : 'text'}
                    autoComplete="off"
                    placeholder={item.secret ? (item.set ? `Saved (${item.value}): type to replace` : 'Not set') : 'Not set'}
                    value={drafts[item.name] ?? (item.secret ? '' : item.value)}
                    onChange={(e) => setDrafts({ ...drafts, [item.name]: e.target.value })}
                  />
                  {item.set && (
                    <button className="ghost" type="button" disabled={busy} onClick={() => save({ [item.name]: null }, `${item.name} cleared.`)}>
                      Clear
                    </button>
                  )}
                </div>
                <p className="hint">
                  {item.hint}
                  {!item.set && item.effective ? ' Currently using the Worker’s own value.' : ''}
                </p>
              </div>
            ))}
            <div className="row">
              <button className="primary" type="submit" disabled={busy}>
                Save
              </button>
              <button className="ghost" type="button" onClick={logout}>
                Sign out
              </button>
            </div>
          </form>
        )}

        <div className={`status${status.error ? ' err' : ''}`} role="status">
          {status.text}
        </div>
      </main>
    </div>
  );
}

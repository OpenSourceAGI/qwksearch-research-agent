/**
 * The admin side: `<VideoLibraryAdmin />` and `<VideoAvailabilityPanel />`
 * over an HTTP client pointed at the Worker's `/api/library`.
 *
 * The Worker says which mode it runs in (`GET /api/demo`):
 * - **sandbox**: no token needed; edits land in an in-memory copy of the
 *   library that lives as long as the Worker isolate, so they vanish on their
 *   own. This is what a fresh deploy with no secrets runs.
 * - **token**: an `ADMIN_TOKEN` secret is set; paste it below and the client
 *   sends it as `Authorization: Bearer …` on every request.
 * - **read-only**: a D1 database is bound but no token is set, so every admin
 *   route answers 403. A persistent library is never open to the public.
 *
 * The token sits in sessionStorage: it survives a reload, not a closed tab.
 */
import { createLibraryClient } from 'extract-youtube/library';
import { VideoAvailabilityPanel, VideoLibraryAdmin } from 'extract-youtube/react';
import { useMemo, useState } from 'react';

import type { DemoInfo } from '../worker';

const TOKEN_KEY = 'extract-youtube-demo:admin-token';

function readToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveToken(token: string) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: the token lasts for this page only.
  }
}

export function AdminView({ info }: { info: DemoInfo | null }) {
  const [token, setToken] = useState(readToken);
  const [draft, setDraft] = useState(token);
  // An edit on one panel remounts the other, so it reloads its rows. Each keeps
  // its own filters and page through its own edits.
  const [adminRevision, setAdminRevision] = useState(0);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);

  const client = useMemo(
    () => createLibraryClient({ baseUrl: '/api/library', headers: (): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {}) }),
    [token],
  );

  const applyToken = () => {
    const next = draft.trim();
    saveToken(next);
    setToken(next);
  };

  return (
    <>
      {info?.mode === 'sandbox' && (
        <p className="notice">
          Sandbox mode: anyone can add, edit and delete here. Changes live in this Worker's memory and reset on
          their own, so try anything. {info.youtubeApiKey ? '' : 'Auto-fill uses YouTube oEmbed (title and channel) because no YouTube API key is set, and Resync is off.'}
        </p>
      )}
      {info?.mode === 'read-only' && (
        <p className="notice">
          Read-only: this deploy keeps its library in D1 and has no <code>ADMIN_TOKEN</code> set, so the admin
          routes refuse every edit.
        </p>
      )}
      {info?.mode === 'token' && (
        <form
          className="admin-token"
          onSubmit={(event) => {
            event.preventDefault();
            applyToken();
          }}
        >
          <label htmlFor="admin-token">Admin token</label>
          <input id="admin-token" type="password" value={draft} onChange={(event) => setDraft(event.target.value)} autoComplete="off" />
          <button type="submit">{token ? 'Update' : 'Use token'}</button>
          {token && <span>Sending the token with every request.</span>}
        </form>
      )}

      <VideoLibraryAdmin key={`admin-${token}-${adminRevision}`} client={client} onChange={() => setAvailabilityRevision((n) => n + 1)} />

      <div className="section-gap" />
      <VideoAvailabilityPanel
        key={`availability-${token}-${availabilityRevision}`}
        client={client}
        onChange={() => setAdminRevision((n) => n + 1)}
      />
    </>
  );
}

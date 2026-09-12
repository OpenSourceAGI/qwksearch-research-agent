/**
 * Room parsing and authorisation for the Reason Editor's collaboration rooms.
 *
 * Kept separate from the server bootstrap (`collaboration/server.ts`) so it can
 * be unit-tested without opening a socket, and kept in `lib/` because the two
 * endpoints it calls — `/api/collaboration/session` and
 * `/api/collaboration/access` — are route handlers in this same app.
 *
 * Room names are `reason-editor:<engine>:<documentId>` and are minted by
 * `packages/reason-editor/src/docs-agent/collaboration/hocuspocus-client.ts`.
 * The two must agree — the parity tests assert that they do.
 */

export const ROOM_PREFIX = 'reason-editor';

/** Route handlers in this app that answer the two questions below. */
export const SESSION_ENDPOINT_PATH = '/api/collaboration/session';
export const ACCESS_ENDPOINT_PATH = '/api/collaboration/access';

export type EditorEngine = 'tiptap' | 'plate';

export interface ParsedRoom {
  engine: EditorEngine;
  documentId: string;
}

export function parseRoom(documentName: string): ParsedRoom | null {
  const [prefix, engine, ...rest] = documentName.split(':');
  const documentId = rest.join(':');

  if (prefix !== ROOM_PREFIX) return null;
  if (engine !== 'tiptap' && engine !== 'plate') return null;
  if (!documentId) return null;

  return { engine, documentId };
}

/**
 * Where to ask this app's API. `QWKSEARCH_API_URL` is the one variable that
 * wires both endpoints up (`https://qwksearch.com`); the individual
 * `REASON_*_URL` variables still win when set, so the server can be pointed at
 * a different session or ACL backend without touching this file.
 */
function apiEndpoint(path: string): string | undefined {
  const base = process.env.QWKSEARCH_API_URL?.trim();
  if (!base) return undefined;

  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
}

function sessionEndpoint(): string | undefined {
  return process.env.REASON_AUTH_URL?.trim() || apiEndpoint(SESSION_ENDPOINT_PATH);
}

function accessEndpoint(): string | undefined {
  return process.env.REASON_DOCUMENT_ACL_URL?.trim() || apiEndpoint(ACCESS_ENDPOINT_PATH);
}

/**
 * Shared secret proving a request to `/api/collaboration/access` came from this
 * server rather than from a browser — that endpoint answers "what may user X do
 * to document Y", which nobody else may ask. Sent as `x-collaboration-secret`;
 * the route rejects the request without it whenever it is configured there.
 */
function internalSecretHeaders(): Record<string, string> {
  const secret = process.env.REASON_COLLAB_SECRET?.trim();
  return secret ? { 'x-collaboration-secret': secret } : {};
}

export interface SessionUser {
  id: string;
  name: string;
}

/**
 * Resolves a connection token to a user.
 *
 * Demo default: the token *is* the user id. Set `QWKSEARCH_API_URL` (or
 * `REASON_AUTH_URL`) in production and this calls the session endpoint instead
 * — never ship the demo branch, since it lets anyone claim any identity.
 */
export async function resolveUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  const authUrl = sessionEndpoint();

  if (!authUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'QWKSEARCH_API_URL (or REASON_AUTH_URL) is required in production: refusing to accept unverified tokens',
      );
    }

    return { id: token, name: token };
  }

  const response = await fetch(authUrl, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const body = (await response.json()) as { id?: string; name?: string };
  if (!body.id) return null;

  return { id: body.id, name: body.name ?? body.id };
}

/**
 * Document-level access control. Returns the granted role, or `null` when the
 * user may not read the document at all — which is what stops an unauthorised
 * second user from syncing.
 */
export async function authorizeDocument(
  user: SessionUser,
  documentId: string,
): Promise<'read' | 'write' | null> {
  const aclUrl = accessEndpoint();

  if (!aclUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'QWKSEARCH_API_URL (or REASON_DOCUMENT_ACL_URL) is required in production: refusing to grant blanket document access',
      );
    }

    return 'write';
  }

  const separator = aclUrl.includes('?') ? '&' : '?';
  const response = await fetch(
    `${aclUrl}${separator}documentId=${encodeURIComponent(documentId)}&userId=${encodeURIComponent(user.id)}`,
    { headers: internalSecretHeaders() },
  );

  if (!response.ok) return null;

  const body = (await response.json()) as { role?: string };

  if (body.role === 'write' || body.role === 'read') return body.role;

  return null;
}

export interface AuthenticateResult {
  user: SessionUser;
  engine: EditorEngine;
  documentId: string;
  readOnly: boolean;
}

/** The whole `onAuthenticate` decision, as a pure-ish function. */
export async function authenticateConnection({
  documentName,
  token,
}: {
  documentName: string;
  token?: string;
}): Promise<AuthenticateResult> {
  const room = parseRoom(documentName);
  if (!room) throw new Error('Invalid document room');

  const user = await resolveUser(token);
  if (!user) throw new Error('Unauthorized');

  const role = await authorizeDocument(user, room.documentId);
  if (!role) throw new Error('Forbidden');

  return {
    user,
    engine: room.engine,
    documentId: room.documentId,
    readOnly: role === 'read',
  };
}

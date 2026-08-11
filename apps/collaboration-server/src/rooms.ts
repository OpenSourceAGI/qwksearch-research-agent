/**
 * Room parsing and authorisation, kept separate from the server bootstrap so it
 * can be unit-tested without opening a socket.
 *
 * Room names are `reason-editor:<engine>:<documentId>` and are minted by
 * `packages/reason-editor/src/docs-agent/collaboration/hocuspocus-client.ts`.
 * The two must agree — the parity tests assert that they do.
 */

export const ROOM_PREFIX = 'reason-editor';

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

export interface SessionUser {
  id: string;
  name: string;
}

/**
 * Resolves a connection token to a user.
 *
 * Demo default: the token *is* the user id. Point `REASON_AUTH_URL` at your
 * session endpoint in production and this calls it instead — never ship the
 * demo branch, since it lets anyone claim any identity.
 */
export async function resolveUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  const authUrl = process.env.REASON_AUTH_URL;

  if (!authUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'REASON_AUTH_URL is required in production: refusing to accept unverified tokens',
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
  const aclUrl = process.env.REASON_DOCUMENT_ACL_URL;

  if (!aclUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'REASON_DOCUMENT_ACL_URL is required in production: refusing to grant blanket document access',
      );
    }

    return 'write';
  }

  const response = await fetch(
    `${aclUrl}?documentId=${encodeURIComponent(documentId)}&userId=${encodeURIComponent(user.id)}`,
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

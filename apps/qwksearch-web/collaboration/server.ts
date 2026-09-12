/**
 * Hocuspocus server for the Reason Editor's collaboration rooms.
 *
 * Part of `apps/qwksearch-web`, not an app of its own: a Yjs room is a
 * long-lived WebSocket with CRDT state, which a Cloudflare Worker request
 * handler cannot hold, so this runs as a Bun process next to the deployed
 * Worker (`bun run collab` from `apps/qwksearch-web`). Everything it needs to
 * decide — who is connecting, and what they may do to a document — it asks this
 * same app's API: `/api/collaboration/session` and `/api/collaboration/access`,
 * reached via `QWKSEARCH_API_URL`.
 *
 * One server backs both engines, but the rooms never mix: `onAuthenticate`
 * rejects any document name that is not `reason-editor:<tiptap|plate>:<id>`,
 * so a Slate document can never land in a room a ProseMirror client will open.
 *
 * For production use `wss://`, set `QWKSEARCH_API_URL` so tokens and document
 * access are actually verified, and set `REASON_COLLAB_SECRET` to the same
 * value the app has, so the ACL endpoint answers this server and nobody else.
 */

import { SQLite } from '@hocuspocus/extension-sqlite';
import { Server } from '@hocuspocus/server';

import { authenticateConnection } from '../lib/collaboration/rooms';

const port = Number(process.env.PORT ?? 1234);
const database = process.env.REASON_SQLITE_PATH ?? './data/reason-editor.sqlite';

const server = new Server({
  port,

  extensions: [new SQLite({ database })],

  async onAuthenticate({ token, documentName, connectionConfig }) {
    const result = await authenticateConnection({ documentName, token });

    // Readers connect but cannot write into the shared document.
    if (result.readOnly) connectionConfig.readOnly = true;

    return {
      user: result.user,
      engine: result.engine,
      documentId: result.documentId,
    };
  },
});

server.listen().then(() => {
  // eslint-disable-next-line no-console
  console.log(`[collaboration] listening on ws://127.0.0.1:${port} (sqlite: ${database})`);
});

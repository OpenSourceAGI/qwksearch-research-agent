/**
 * Hocuspocus server for the Reason Editor's collaboration rooms.
 *
 * One server backs both engines, but the rooms never mix: `onAuthenticate`
 * rejects any document name that is not `reason-editor:<tiptap|plate>:<id>`,
 * so a Slate document can never land in a room a ProseMirror client will open.
 *
 * Run it with `bun run dev` from `apps/collaboration-server`. For production use
 * `wss://`, set `REASON_AUTH_URL` so tokens are actually verified, and set
 * `REASON_DOCUMENT_ACL_URL` so document-level access is checked before sync.
 */

import { SQLite } from '@hocuspocus/extension-sqlite';
import { Server } from '@hocuspocus/server';

import { authenticateConnection } from './rooms';

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
  console.log(`[collaboration-server] listening on ws://127.0.0.1:${port} (sqlite: ${database})`);
});
